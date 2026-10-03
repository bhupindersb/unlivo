"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Home, IndianRupee, Upload, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Transaction = {
  id:string; property_id:string; offer_id:string; buyer_id:string; seller_id:string;
  agreed_amount:number; status:"initiated"|"in_progress"|"completed"|"cancelled";
  started_at:string; completed_at:string|null; cancelled_at:string|null; notes:string|null;
  buyer_confirmed_at:string|null; seller_confirmed_at:string|null;
};
type Property={id:string;title:string;city:string|null;locality:string|null;purpose:string;status:string;price:number|null;rent_monthly:number|null};
type Event={id:string;actor_id:string|null;action:string;from_status:string|null;to_status:string|null;amount:number|null;note:string|null;created_at:string};
type Participant={id:string;full_name:string|null;role:"buyer"|"seller"|null};
type Document={id:string;document_type:string;file_name:string;storage_path:string;mime_type:string|null;file_size:number|null;uploaded_by:string;created_at:string};

function money(value:number|null){return value==null?"—":`₹ ${Number(value).toLocaleString("en-IN",{maximumFractionDigits:0})}`;}
function statusLabel(s:string){return s==="initiated"?"Transaction Started":s==="in_progress"?"In Progress":s==="completed"?"Completed":"Cancelled";}
function eventLabel(e:Event){if(e.action==="offer_accepted")return "Offer accepted";if(e.action==="buyer_confirmed")return "Buyer confirmed purchase completion";if(e.action==="seller_confirmed")return "Seller confirmed sale completion";if(e.action==="staff_completed")return "Transaction completed by UNLIVO staff";if(e.action==="status_changed")return e.to_status?statusLabel(e.to_status):"Transaction updated";return e.action.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

export default function TransactionDetailPage(){
  const params=useParams<{id:string}>();
  const [transaction,setTransaction]=useState<Transaction|null>(null);
  const [property,setProperty]=useState<Property|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [userId,setUserId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [documents,setDocuments]=useState<Document[]>([]);
  const [uploading,setUploading]=useState(false);

  async function load(){
    if(!supabase||!params?.id){setError("Transaction could not be loaded.");setLoading(false);return;}
    const {data:{session}}=await supabase.auth.getSession();
    const uid=session?.user?.id||null;
    if(!uid){window.location.href="/login";return;}
    setUserId(uid);
    const t=await supabase.from("property_transactions").select("id,property_id,offer_id,buyer_id,seller_id,agreed_amount,status,started_at,completed_at,cancelled_at,notes,buyer_confirmed_at,seller_confirmed_at").eq("id",params.id).maybeSingle();
    if(t.error||!t.data){setError(t.error?.message||"Transaction not found.");setLoading(false);return;}
    const row=t.data as Transaction;
    setTransaction(row);
    const [p,e,people,docs]=await Promise.all([
      supabase.from("properties").select("id,title,city,locality,purpose,status,price,rent_monthly").eq("id",row.property_id).maybeSingle(),
      supabase.from("property_transaction_events").select("id,actor_id,action,from_status,to_status,amount,note,created_at").eq("transaction_id",row.id).order("created_at",{ascending:false}),
      supabase.rpc("get_property_transaction_participant_profiles",{p_transaction_id:row.id}),
      supabase.from("property_transaction_documents").select("id,document_type,file_name,storage_path,mime_type,file_size,uploaded_by,created_at").eq("transaction_id",row.id).order("created_at",{ascending:false})
    ]);
    if(p.data)setProperty(p.data as Property);
    if(!e.error)setEvents((e.data||[]) as Event[]);
    if(!people.error)setParticipants((people.data||[]) as Participant[]);
    if(!docs.error)setDocuments((docs.data||[]) as Document[]);
    if(e.error)setError(e.error.message);
    setLoading(false);
  }

  useEffect(()=>{load()},[params?.id]);

  const me=transaction?.buyer_id===userId?"buyer":transaction?.seller_id===userId?"seller":"staff";

  const updateStatus=async(next:"in_progress"|"cancelled")=>{
    if(!supabase||!transaction)return;
    const prompt=next==="cancelled"?"Cancel this transaction? This should only be used if the transaction will not proceed.":"Start the transaction and move it into the active transaction stage.";
    if(!window.confirm(prompt))return;
    setBusy(true);setMessage("");setError("");
    const r=await supabase.rpc("update_property_transaction_status",{p_transaction_id:transaction.id,p_status:next});
    if(r.error||r.data!==true)setError(r.error?.message||"This transaction status cannot be changed.");
    else{setMessage("Transaction updated.");await load();}
    setBusy(false);
  };

  const confirmCompletion=async()=>{
    if(!supabase||!transaction||me==="staff")return;
    const prompt=me==="buyer"?"Confirm that your purchase is completed. The seller will also need to confirm the sale before UNLIVO marks the transaction completed.":"Confirm that your sale is completed. The buyer will also need to confirm the purchase before UNLIVO marks the transaction completed.";
    if(!window.confirm(prompt))return;
    setBusy(true);setMessage("");setError("");
    const r=await supabase.rpc("confirm_property_transaction",{p_transaction_id:transaction.id});
    if(r.error)setError(r.error.message);
    else{setMessage(r.data==="completed"?"Both parties have confirmed. Transaction completed.":me==="buyer"?"Purchase confirmed. Waiting for seller confirmation.":"Sale confirmed. Waiting for buyer confirmation.");await load();}
    setBusy(false);
  };

  const uploadDocument=async(file:File,documentType:string)=>{
    if(!supabase||!transaction||!userId)return;
    setUploading(true);setError("");setMessage("");
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]+/g,"-");
    const path="transactions/"+transaction.id+"/"+crypto.randomUUID()+"-"+safeName;
    const up=await supabase.storage.from("transaction-documents").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
    if(up.error){setError(up.error.message);setUploading(false);return;}
    const ins=await supabase.from("property_transaction_documents").insert({transaction_id:transaction.id,uploaded_by:userId,document_type:documentType,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size});
    if(ins.error){await supabase.storage.from("transaction-documents").remove([path]);setError(ins.error.message);setUploading(false);return;}
    setMessage("Document uploaded successfully.");await load();setUploading(false);
  };
  const downloadDocument=async(d:Document)=>{if(!supabase)return;const r=await supabase.storage.from("transaction-documents").createSignedUrl(d.storage_path,300);if(r.error){setError(r.error.message);return;}window.open(r.data.signedUrl,"_blank","noopener,noreferrer");};
  const deleteDocument=async(d:Document)=>{if(!supabase||!window.confirm("Delete this document?"))return;setError("");const r=await supabase.storage.from("transaction-documents").remove([d.storage_path]);if(r.error){setError(r.error.message);return;}const db=await supabase.from("property_transaction_documents").delete().eq("id",d.id);if(db.error){setError(db.error.message);return;}setDocuments(prev=>prev.filter(x=>x.id!==d.id));setMessage("Document deleted.");};

  if(loading)return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader/><div className="container py-24 text-center text-sm text-[#687987]">Loading transaction…</div><SiteFooter/></main>;
  if(error||!transaction||!property)return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader/><div className="container py-24 text-center"><h1 className="text-2xl font-extrabold">Transaction unavailable</h1><p className="mt-3 text-sm text-[#687987]">{error}</p><a href="/my-properties" className="mt-7 inline-flex rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">My Properties</a></div><SiteFooter/></main>;

  const buyer=participants.find(x=>x.role==="buyer");
  const seller=participants.find(x=>x.role==="seller");
  const canProgress=transaction.status==="initiated"||transaction.status==="in_progress";
  const myConfirmed=me==="buyer"?!!transaction.buyer_confirmed_at:me==="seller"?!!transaction.seller_confirmed_at:false;

  return <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
    <SiteHeader/>
    <section className="container max-w-6xl py-8 lg:py-12">
      <a href="/my-properties" className="inline-flex items-center gap-2 text-sm font-bold text-[#547083] hover:text-[#123b53]"><ArrowLeft size={16}/> Back to My Properties</a>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO Transaction</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] lg:text-4xl">{property.title}</h1><p className="mt-2 text-sm text-[#687987]">{[property.locality,property.city].filter(Boolean).join(", ")}</p></div>
        <span className="inline-flex w-fit rounded-full bg-[#e9faf6] px-4 py-2 text-xs font-extrabold uppercase tracking-[1.2px] text-[#087f73]">{statusLabel(transaction.status)}</span>
      </div>
      {message&&<div className="mt-6 rounded-xl border border-[#bfe5d7] bg-[#f1fbf8] px-4 py-3 text-sm font-semibold text-[#087f73]">{message}</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><div className="flex items-center gap-3"><IndianRupee className="text-[#0bb89b]" size={22}/><p className="text-sm font-extrabold uppercase tracking-[1.5px] text-[#547083]">Agreed transaction amount</p></div><p className="mt-3 text-4xl font-extrabold">{money(transaction.agreed_amount)}</p><p className="mt-2 text-sm text-[#687987]">This is the amount recorded when the offer was accepted.</p></div>
          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-extrabold">Transaction documents</h2><span className="text-xs text-[#7b8c97]">{documents.length} file{documents.length===1?"":"s"}</span></div>
            <p className="mt-2 text-sm leading-6 text-[#687987]">Upload agreements, identity documents, payment proofs, or other paperwork related to this transaction. Only the buyer, seller, and authorised UNLIVO staff can access these files.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(["agreement","identity","payment_proof","bank_document","sale_deed","other"] as const).map(type=><label key={type} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#cbdde3] bg-white px-4 py-2.5 text-xs font-bold text-[#123b53] hover:bg-[#f7fafb]">
                <Upload size={15}/>{type.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}<input type="file" className="hidden" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)uploadDocument(f,type);e.currentTarget.value=""}}/>
              </label>)}
            </div>
            {uploading&&<p className="mt-3 text-xs font-semibold text-[#547083]">Uploading document…</p>}
            <div className="mt-6 space-y-3">
              {documents.length===0?<div className="rounded-2xl bg-[#f7fafb] p-5 text-sm text-[#687987]">No transaction documents have been uploaded yet.</div>:documents.map(d=><div key={d.id} className="flex flex-col gap-3 rounded-2xl border border-[#e3ecef] bg-[#fbfcfd] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef5ff] text-[#315b91]"><FileText size={18}/></div><div className="min-w-0"><p className="truncate text-sm font-bold">{d.file_name}</p><p className="mt-1 text-[11px] text-[#7b8c97]">{d.document_type.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase())} · {d.file_size?Math.max(1,Math.round(d.file_size/1024))+" KB":"—"} · {new Date(d.created_at).toLocaleDateString("en-IN")}</p></div></div>
                <div className="flex shrink-0 gap-2"><button onClick={()=>downloadDocument(d)} className="rounded-xl border border-[#cbdde3] px-3 py-2 text-xs font-bold text-[#123b53]">View</button>{(d.uploaded_by===userId||me==="staff")&&<button onClick={()=>deleteDocument(d)} className="rounded-xl border border-[#efcccc] bg-[#fff7f7] px-3 py-2 text-xs font-bold text-[#a24646]">Delete</button>}</div>
              </div>)}
            </div>
          </div>
          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-extrabold">Transaction timeline</h2><span className="text-xs text-[#7b8c97]">{events.length} event{events.length===1?"":"s"}</span></div>
            <div className="mt-7 space-y-6">{events.map((e,i)=><div key={e.id} className="relative flex gap-4"><div className="relative flex shrink-0 flex-col items-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9faf6] text-[#087f73]"><CheckCircle2 size={18}/></div>{i<events.length-1&&<div className="absolute top-10 h-full w-px bg-[#dfe9ed]"/>}</div><div className="min-w-0 pb-2"><p className="font-bold">{eventLabel(e)}</p><p className="mt-1 text-xs text-[#7b8c97]">{new Date(e.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</p>{e.amount!=null&&<p className="mt-2 text-sm font-bold">{money(e.amount)}</p>}{e.note&&<p className="mt-2 text-sm leading-6 text-[#687987]">{e.note}</p>}</div></div>)}</div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm"><h2 className="text-lg font-extrabold">Participants</h2><div className="mt-5 space-y-4"><div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#547083]">Buyer</p><p className="mt-1 font-bold">{buyer?.full_name||"Buyer"}</p>{me==="buyer"&&<p className="mt-1 text-xs text-[#087f73]">You</p>}</div><div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#547083]">Seller</p><p className="mt-1 font-bold">{seller?.full_name||"Seller"}</p>{me==="seller"&&<p className="mt-1 text-xs text-[#087f73]">You</p>}</div></div></div>

          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold">Transaction actions</h2>
            <p className="mt-2 text-sm leading-6 text-[#687987]">Both the buyer and seller must confirm completion. The property remains under offer until the seller marks it Sold.</p>
            {transaction.status==="in_progress"&&<div className="mt-4 grid gap-2 rounded-2xl bg-[#f7fafb] p-4 text-xs text-[#687987]"><div>Buyer: <strong>{transaction.buyer_confirmed_at?"Confirmed":"Waiting for confirmation"}</strong></div><div>Seller: <strong>{transaction.seller_confirmed_at?"Confirmed":"Waiting for confirmation"}</strong></div></div>}
            {canProgress&&<div className="mt-5 grid gap-3">
              {transaction.status==="initiated"&&<button disabled={busy} onClick={()=>updateStatus("in_progress")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b53] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Clock3 size={17}/> Start transaction</button>}
              {transaction.status==="in_progress"&&me!=="staff"&&<button disabled={busy||myConfirmed} onClick={confirmCompletion} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087f73] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 size={17}/>{myConfirmed?"Confirmation recorded":me==="buyer"?"Confirm purchase completed":"Confirm sale completed"}</button>}
              <button disabled={busy} onClick={()=>updateStatus("cancelled")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#efcccc] bg-[#fff7f7] px-5 py-3 text-sm font-bold text-[#a24646] disabled:opacity-60"><XCircle size={17}/> Cancel transaction</button>
            </div>}
            {transaction.status==="completed"&&<div className="mt-5 rounded-2xl bg-[#f1fbf8] p-4 text-sm font-semibold text-[#087f73]">Both parties have confirmed the transaction. The seller can now complete the property sale by marking the property Sold.</div>}
            {transaction.status==="cancelled"&&<div className="mt-5 rounded-2xl bg-[#fff7f7] p-4 text-sm font-semibold text-[#a24646]">This transaction has been cancelled.</div>}
          </div>

          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm"><h2 className="text-lg font-extrabold">Property</h2><p className="mt-2 text-sm text-[#687987]">{[property.locality,property.city].filter(Boolean).join(", ")}</p><a href={`/properties/${property.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"><Home size={16}/> View property</a></div>
        </aside>
      </div>
    </section>
    <SiteFooter/>
  </main>;
}

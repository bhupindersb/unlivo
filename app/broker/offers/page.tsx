"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { ArrowRight, Check, ChevronDown, Clock3, HandCoins, MessageCircle, RotateCcw, Search, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Offer = { id:string; property_id:string; buyer_id:string; offer_amount:number; message:string|null; status:string; response_amount:number|null; response_message:string|null; last_action_by:string|null; created_at:string; updated_at:string };
type Property = { id:string; title:string; city:string|null; locality:string|null; price:number|null };
type Buyer = { id:string; full_name:string|null; email:string|null; phone:string|null };
type Transaction = { id:string; offer_id:string; status:string };
type OfferEvent = { id:string; offer_id:string; action:string; amount:number|null; message:string|null; created_at:string };

const money=(v:number|null)=>v==null?"—":`₹ ${Number(v).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const label=(v:string)=>v.replaceAll("_"," ").replace(/\\b\\w/g,c=>c.toUpperCase());
const date=(v:string)=>new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const statusStyle:Record<string,string>={submitted:"bg-[#fff8e8] text-[#8a6416]",countered:"bg-[#eef5ff] text-[#315b91]",accepted:"bg-[#e9faf6] text-[#087f73]",declined:"bg-[#fff2f2] text-[#9b4d4d]",withdrawn:"bg-[#eef3f6] text-[#60737e]"};

export default function BrokerOffersPage(){
 const [offers,setOffers]=useState<Offer[]>([]),[properties,setProperties]=useState<Property[]>([]),[buyers,setBuyers]=useState<Buyer[]>([]),[transactions,setTransactions]=useState<Transaction[]>([]),[events,setEvents]=useState<OfferEvent[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState("all"),[expanded,setExpanded]=useState("");
 const [busy,setBusy]=useState(""),[counterId,setCounterId]=useState(""),[counterAmount,setCounterAmount]=useState(""),[counterMessage,setCounterMessage]=useState("");

 async function load(){
  setLoading(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){window.location.href="/login";return;}
  const {data:profile}=await supabase.from("profiles").select("role,access_status,broker_status").eq("id",user.id).maybeSingle();
  if(profile?.role!=="broker"||profile.access_status!=="active"||profile.broker_status!=="approved"){window.location.href="/for-brokers";return;}
  const {data:relations,error:relationError}=await supabase.from("property_broker_relationships").select("property_id").eq("broker_id",user.id).eq("relationship_type","listing_representation").eq("status","active");
  if(relationError){setError(relationError.message);setLoading(false);return;}
  const ids=Array.from(new Set((relations||[]).map(x=>x.property_id)));
  if(!ids.length){setOffers([]);setProperties([]);setBuyers([]);setTransactions([]);setEvents([]);setLoading(false);return;}
  const [o,p]=await Promise.all([
   supabase.from("property_offers").select("id,property_id,buyer_id,offer_amount,message,status,response_amount,response_message,last_action_by,created_at,updated_at").in("property_id",ids).order("updated_at",{ascending:false}),
   supabase.from("properties").select("id,title,city,locality,price").in("id",ids)
  ]);
  if(o.error||p.error){setError((o.error||p.error)?.message||"Could not load offers.");setLoading(false);return;}
  const rows=(o.data||[]) as Offer[],props=(p.data||[]) as Property[];
  const buyerIds=Array.from(new Set(rows.map(x=>x.buyer_id)));
  const offerIds=rows.map(x=>x.id);
  const [b,t,e]=await Promise.all([
   buyerIds.length?supabase.from("profiles").select("id,full_name,email,phone").in("id",buyerIds):Promise.resolve({data:[],error:null}),
   offerIds.length?supabase.from("property_transactions").select("id,offer_id,status").in("offer_id",offerIds):Promise.resolve({data:[],error:null}),
   offerIds.length?supabase.from("property_offer_events").select("id,offer_id,action,amount,message,created_at").in("offer_id",offerIds).order("created_at",{ascending:true}):Promise.resolve({data:[],error:null})
  ]);
  if(b.error||t.error||e.error)setError((b.error||t.error||e.error)?.message||"Some offer details could not be loaded.");
  setOffers(rows);setProperties(props);setBuyers((b.data||[]) as Buyer[]);setTransactions((t.data||[]) as Transaction[]);setEvents((e.data||[]) as OfferEvent[]);setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 const propertyFor=(id:string)=>properties.find(p=>p.id===id),buyerFor=(id:string)=>buyers.find(p=>p.id===id),transactionFor=(id:string)=>transactions.find(t=>t.offer_id===id);
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return offers.filter(o=>(filter==="all"||o.status===filter)&&(!q||[propertyFor(o.property_id)?.title,propertyFor(o.property_id)?.city,buyerFor(o.buyer_id)?.full_name,o.status,o.offer_amount,o.response_amount].filter(Boolean).join(" ").toLowerCase().includes(q)))},[offers,properties,buyers,filter,search]);
 async function updateOffer(offer:Offer,next:"accepted"|"declined"|"countered"){
  setBusy(offer.id);setError("");
  const values:Record<string,unknown>={status:next};
  if(next==="countered"){
   const amount=Number(counterAmount);
   if(!Number.isFinite(amount)||amount<=0){setError("Enter a valid counter offer amount.");setBusy("");return;}
   values.response_amount=amount;values.response_message=counterMessage.trim()||null;
  }
  if(next==="accepted"&&offer.response_amount==null)values.response_amount=offer.offer_amount;
  const result=await supabase.from("property_offers").update(values).eq("id",offer.id);
  if(result.error){setError(result.error.message);setBusy("");return;}
  setCounterId("");setCounterAmount("");setCounterMessage("");
  await supabase.functions.invoke("notify-enquiry",{body:{event:"offer_update",offer_id:offer.id}});
  await load();setBusy("");
 }
 if(loading)return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb]"><div className="container py-24 text-center text-sm text-[#687987]">Loading broker offers…</div></main><SiteFooter/></>;
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-7xl py-10 lg:py-14">
  <a href="/broker" className="text-sm font-bold text-[#547083]">← Broker workspace</a>
  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">Broker Workspace</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1px]">Property Offers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687987]">Review offers received on properties you actively represent, negotiate with buyers and move accepted offers into transactions.</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-[#e9faf6] px-4 py-3 text-xs font-bold text-[#087f73]"><HandCoins size={16}/>{offers.length} offers</span></div>
  {error&&<div className="mt-5 rounded-xl border border-[#efd0d0] bg-[#fff7f7] p-3 text-sm text-[#8b4b4b]">{error}</div>}
  <div className="mt-7 grid gap-3 sm:grid-cols-5">{["all","submitted","countered","accepted","declined"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`rounded-xl border p-3 text-left ${filter===s?"border-[#0bb89b] bg-[#f0fbf8]":"border-[#dfe9ed] bg-white"}`}><p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#71838e]">{label(s)}</p><p className="mt-1 text-2xl font-extrabold">{s==="all"?offers.length:offers.filter(o=>o.status===s).length}</p></button>)}</div>
  <div className="mt-6 rounded-3xl border border-[#dfe9ed] bg-white shadow-sm"><div className="border-b border-[#e8eef1] p-5"><div className="relative"><Search size={16} className="absolute left-4 top-3.5 text-[#8a9aa4]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search property or buyer…" className="h-11 w-full rounded-xl border border-[#d7e3e8] pl-11 pr-4 text-sm outline-none focus:border-[#0bb89b]"/></div></div>
  {!visible.length?<div className="p-12 text-center"><HandCoins size={34} className="mx-auto text-[#0bb89b]"/><h2 className="mt-4 text-xl font-extrabold">No offers found</h2><p className="mt-2 text-sm text-[#71838e]">Offers on your active listing relationships will appear here.</p></div>:<div className="divide-y divide-[#edf1f3]">{visible.map(o=>{const p=propertyFor(o.property_id),b=buyerFor(o.buyer_id),tx=transactionFor(o.id),canRespond=o.status==="submitted"||(o.status==="countered"&&o.last_action_by===o.buyer_id),open=expanded===o.id;return <article key={o.id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1px] ${statusStyle[o.status]||"bg-[#eef3f6] text-[#60737e]"}`}>{label(o.status)}</span><span className="text-xs text-[#81929b]">{date(o.updated_at)}</span></div><h2 className="mt-3 text-lg font-extrabold">{p?.title||"Property"}</h2><p className="mt-1 text-sm text-[#687987]">{[p?.locality,p?.city].filter(Boolean).join(", ")} · Buyer: {b?.full_name||"Buyer"}</p><div className="mt-3 flex flex-wrap gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#81929b]">Buyer offer</p><p className="mt-1 text-xl font-extrabold">{money(o.offer_amount)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#81929b]">Latest response</p><p className="mt-1 text-xl font-extrabold">{money(o.response_amount)}</p></div></div></div><div className="flex flex-wrap gap-2"><button onClick={()=>setExpanded(open?"":o.id)} className="inline-flex items-center gap-1 rounded-xl border border-[#cbdde3] px-3 py-2.5 text-sm font-bold"><ChevronDown size={15} className={open?"rotate-180":""}/>Details</button>{canRespond&&<><button disabled={busy===o.id} onClick={()=>void updateOffer(o,"accepted")} className="inline-flex items-center gap-1 rounded-xl bg-[#123b53] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={15}/>Accept</button><button disabled={busy===o.id} onClick={()=>void updateOffer(o,"declined")} className="inline-flex items-center gap-1 rounded-xl border border-[#efcccc] px-3 py-2.5 text-sm font-bold text-[#9b4d4d] disabled:opacity-50"><X size={15}/>Decline</button><button disabled={busy===o.id} onClick={()=>{setCounterId(o.id);setCounterAmount(String(o.response_amount??o.offer_amount));setCounterMessage("");setExpanded(o.id)}} className="inline-flex items-center gap-1 rounded-xl border border-[#cbdde3] px-3 py-2.5 text-sm font-bold"><RotateCcw size={15}/>Counter</button></>}</div></div>
  {open&&<div className="mt-5 grid gap-4 border-t border-[#edf1f3] pt-5 lg:grid-cols-2"><div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#81929b]">Buyer message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536a77]">{o.message||"No message provided."}</p>{o.response_message&&<><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[1px] text-[#81929b]">Latest response message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536a77]">{o.response_message}</p></>}</div><div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#81929b]">Negotiation history</p><div className="mt-3 space-y-3">{events.filter(e=>e.offer_id===o.id).map(e=><div key={e.id} className="border-l-2 border-[#b8dcd4] pl-3"><p className="text-xs font-extrabold">{label(e.action)} · {money(e.amount)}</p><p className="mt-1 text-[11px] text-[#81929b]">{date(e.created_at)}</p>{e.message&&<p className="mt-1 text-sm text-[#687987]">{e.message}</p>}</div>)}</div></div></div>}
  {counterId===o.id&&<div className="mt-4 grid gap-3 rounded-2xl border border-[#dfe9ed] bg-[#fbfdfd] p-4 sm:grid-cols-[220px_1fr_auto] sm:items-end"><label className="text-xs font-bold text-[#547083]">Counter amount (₹)<input type="number" min="1" value={counterAmount} onChange={e=>setCounterAmount(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#cbdde3] px-3 text-sm"/></label><label className="text-xs font-bold text-[#547083]">Message (optional)<input value={counterMessage} onChange={e=>setCounterMessage(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#cbdde3] px-3 text-sm" placeholder="Add a note for the buyer"/></label><div className="flex gap-2"><button disabled={busy===o.id} onClick={()=>void updateOffer(o,"countered")} className="rounded-lg bg-[#123b53] px-4 py-2.5 text-xs font-bold text-white">Send counter</button><button onClick={()=>setCounterId("")} className="rounded-lg border border-[#cbdde3] px-3 py-2.5 text-xs font-bold">Cancel</button></div></div>}
  {o.status==="accepted"&&(tx?<div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#b9e4d8] bg-[#eefaf7] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold text-[#087f73]">Offer accepted · Transaction created</p><p className="mt-1 text-xs text-[#52786f]">Agreed amount: {money(o.response_amount??o.offer_amount)}. Continue with documents, coordination and payment tracking.</p></div><a href={`/broker/transactions/${tx.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087f73] px-4 py-3 text-sm font-bold text-white">Open transaction <ArrowRight size={15}/></a></div>:<div className="mt-5 rounded-xl bg-[#f7fafb] p-3 text-sm text-[#687987]">Offer accepted. The transaction record is being prepared; refresh shortly.</div>)}
 </article>})}</div>}
  </div>
 </section></main><SiteFooter/></>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Link2, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type User={id:string;full_name:string|null;email:string|null;role:string;access_status:string|null;broker_status:string|null};
type Property={id:string;title:string;city:string;locality:string;listed_by:string;owner_id:string|null;status:string};
type Relation={id:string;property_id:string;broker_id:string;relationship_type:string;status:string};
type Application={id:string;user_id:string;full_name:string|null;phone:string|null;agency_name:string|null;rera_number:string|null;experience_years:number|null;cities:string[];localities:string[];property_categories:string[];office_address:string|null;website:string|null;notes:string|null;status:string;created_at:string;review_notes:string|null};

export default function AdminBrokers(){
 const[users,setUsers]=useState<User[]>([]);const[properties,setProperties]=useState<Property[]>([]);const[relations,setRelations]=useState<Relation[]>([]);const[applications,setApplications]=useState<Application[]>([]);
 const[brokerId,setBrokerId]=useState("");const[propertyId,setPropertyId]=useState("");const[query,setQuery]=useState("");const[loading,setLoading]=useState(true);const[busy,setBusy]=useState("");const[error,setError]=useState("");const[message,setMessage]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  const auth=await supabase.auth.getUser();
  if(!auth.data.user){window.location.href="/admin/login";return}
  const me=await supabase.from("profiles").select("role").eq("id",auth.data.user.id).maybeSingle();
  if(me.data?.role!=="admin"){window.location.href="/admin/login";return}
  const[us,ps,rs,aps]=await Promise.all([
   supabase.from("profiles").select("id,full_name,email,role,access_status,broker_status").in("role",["broker","owner","buyer","builder"]).order("created_at",{ascending:false}),
   supabase.from("properties").select("id,title,city,locality,listed_by,owner_id,status").order("created_at",{ascending:false}),
   supabase.from("property_broker_relationships").select("id,property_id,broker_id,relationship_type,status").order("created_at",{ascending:false}),
   supabase.from("broker_applications").select("id,user_id,full_name,phone,agency_name,rera_number,experience_years,cities,localities,property_categories,office_address,website,notes,status,created_at,review_notes").order("created_at",{ascending:false})
  ]);
  if(us.error)setError(us.error.message);if(ps.error)setError(ps.error.message);if(rs.error)setError(rs.error.message);if(aps.error)setError(aps.error.message);
  setUsers((us.data||[]) as User[]);setProperties((ps.data||[]) as Property[]);setRelations((rs.data||[]) as Relation[]);setApplications((aps.data||[]) as Application[]);setLoading(false);
 };
 useEffect(()=>{void load()},[]);

 const reviewApplication=async(a:Application,status:"approved"|"rejected")=>{
  if(!window.confirm(status==="approved"?"Approve this broker application?":"Reject this broker application?"))return;
  setBusy(a.id+"-"+status);setError("");setMessage("");
  const r=await supabase.from("broker_applications").update({status,reviewed_by:(await supabase.auth.getUser()).data.user?.id,reviewed_at:new Date().toISOString()}).eq("id",a.id);
  if(r.error)setError(r.error.message);else{setMessage(status==="approved"?"Broker approved.":"Broker application rejected.");await load()}setBusy("");
 };
 const brokers=useMemo(()=>users.filter(u=>u.role==="broker"&&u.broker_status==="approved"&&u.access_status!=="blocked"&&u.access_status!=="revoked"),[users]);
 const availableProperties=useMemo(()=>properties.filter(p=>p.status!=="sold"&&p.status!=="rented"),[properties]);
 const existing=(b:string,p:string)=>relations.find(r=>r.broker_id===b&&r.property_id===p&&r.relationship_type==="listing_representation"&&r.status==="active");
 const assign=async()=>{
  if(!brokerId||!propertyId)return;setBusy("assign");setError("");setMessage("");
  const r=await supabase.from("property_broker_relationships").insert({broker_id:brokerId,property_id:propertyId,relationship_type:"listing_representation",status:"active",created_by:(await supabase.auth.getUser()).data.user?.id});
  if(r.error)setError(r.error.message);else{setMessage("Property assigned to broker.");setBrokerId("");setPropertyId("");await load()}setBusy("");
 };
 const remove=async(id:string)=>{
  if(!window.confirm("Remove this broker's listing assignment?"))return;setBusy(id);
  const r=await supabase.from("property_broker_relationships").update({status:"inactive"}).eq("id",id);
  if(r.error)setError(r.error.message);else await load();setBusy("");
 };
 const q=query.trim().toLowerCase();
 const rows=relations.filter(r=>r.status==="active"&&(!q||[brokers.find(b=>b.id===r.broker_id)?.full_name,brokers.find(b=>b.id===r.broker_id)?.email,properties.find(p=>p.id===r.property_id)?.title,properties.find(p=>p.id===r.property_id)?.city].filter(Boolean).join(" ").toLowerCase().includes(q)));

 if(loading)return <div className="flex min-h-[70vh] items-center justify-center text-sm text-[#607889]">Loading broker management…</div>;
 return <section className="min-w-0 flex-1 px-5 py-8 lg:px-9 lg:py-10">
  <div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Operations</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] text-[#071d2d] lg:text-4xl">Broker Management</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#607889]">Review self-registered brokers, approve access and manage broker-to-property relationships.</p></div>
  {error&&<div className="mt-5 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
  {message&&<div className="mt-5 rounded-xl border border-[#bfe9df] bg-[#effbf8] px-4 py-3 text-sm font-semibold text-[#087f73]">{message}</div>}

  <div className="mt-7 rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm">
   <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><ShieldCheck size={20} className="text-[#087f73]"/><div><h2 className="text-lg font-extrabold">Broker applications</h2><p className="mt-1 text-xs text-[#71838e]">Admin approval is required before listing tools are enabled.</p></div></div><span className="rounded-full bg-[#eef7f5] px-3 py-1 text-xs font-extrabold text-[#087f73]">{applications.filter(a=>a.status==="pending").length} pending</span></div>
   <div className="mt-6 divide-y divide-[#edf1f3]">
    {applications.length===0?<div className="rounded-2xl bg-[#f7fafb] p-8 text-center text-sm text-[#71838e]">No broker applications yet.</div>:applications.map(a=>{
      const suffix=a.phone?" · "+a.phone:"";const rera=a.rera_number?" · RERA "+a.rera_number:"";
      return <div key={a.id} className="py-5 first:pt-0 last:pb-0"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{a.full_name||"Unnamed applicant"}</p><span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[1px] text-[#60737e]">{a.status}</span></div><p className="mt-1 text-xs text-[#71838e]">{a.agency_name||"Independent broker"}{suffix}{rera}</p><p className="mt-2 text-sm text-[#536575]">{a.cities?.join(", ")||"Cities not specified"}{a.localities?.length?" · "+a.localities.join(", "):""}</p><p className="mt-2 text-xs leading-5 text-[#71838e]">{a.notes||"No additional notes provided."}</p></div>{a.status==="pending"&&<div className="flex shrink-0 gap-2"><button disabled={busy===a.id+"-approved"} onClick={()=>void reviewApplication(a,"approved")} className="inline-flex items-center gap-2 rounded-xl bg-[#087f73] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><CheckCircle2 size={15}/>Approve</button><button disabled={busy===a.id+"-rejected"} onClick={()=>void reviewApplication(a,"rejected")} className="inline-flex items-center gap-2 rounded-xl border border-[#ead8d8] px-4 py-2.5 text-xs font-extrabold text-[#9b4d4d] disabled:opacity-50"><XCircle size={15}/>Reject</button></div>}</div></div>
    })}
   </div>
  </div>

  <div className="mt-7 rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm">
   <div className="flex items-center gap-3"><Link2 size={19} className="text-[#087f73]"/><div><h2 className="text-lg font-extrabold">Assign listing representation</h2><p className="mt-1 text-xs text-[#71838e]">Only approved broker accounts can receive manually assigned listings.</p></div></div>
   <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr_auto]"><select value={brokerId} onChange={e=>setBrokerId(e.target.value)} className="h-12 rounded-xl border border-[#dce7eb] bg-white px-4 text-sm font-semibold"><option value="">Select approved broker</option>{brokers.map(b=><option key={b.id} value={b.id}>{b.full_name||"Unnamed"} — {b.email||"No email"}</option>)}</select><select value={propertyId} onChange={e=>setPropertyId(e.target.value)} className="h-12 rounded-xl border border-[#dce7eb] bg-white px-4 text-sm font-semibold"><option value="">Select property</option>{availableProperties.map(p=><option key={p.id} value={p.id}>{p.title} — {[p.locality,p.city].filter(Boolean).join(", ")}</option>)}</select><button disabled={!brokerId||!propertyId||!!existing(brokerId,propertyId)||busy==="assign"} onClick={()=>void assign()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123b53] px-6 text-sm font-bold text-white disabled:opacity-40">{existing(brokerId,propertyId)?"Already assigned":"Assign Broker"}</button></div>
  </div>

  <div className="mt-7 rounded-3xl border border-[#dce7eb] bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-[#e8eef1] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold">Active assignments</h2><p className="mt-1 text-xs text-[#71838e]">{rows.length} active listing relationships</p></div><label className="relative w-full sm:w-80"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9aa4]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search broker or property…" className="h-10 w-full rounded-xl border border-[#dce7eb] pl-10 pr-4 text-sm outline-none"/></label></div>{rows.length===0?<div className="p-12 text-center"><Building2 size={32} className="mx-auto text-[#0bb89b]"/><p className="mt-3 font-bold">No active broker assignments</p><p className="mt-1 text-sm text-[#71838e]">Approved brokers can receive manually assigned listings here.</p></div>:<div className="divide-y divide-[#edf1f3]">{rows.map(r=>{const b=brokers.find(x=>x.id===r.broker_id);const p=properties.find(x=>x.id===r.property_id);return <div key={r.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9faf6] text-[#087f73]"><UserRound size={18}/></div><div className="min-w-0"><p className="font-extrabold">{b?.full_name||"Unnamed broker"}</p><p className="mt-1 text-xs text-[#71838e]">{b?.email||"No email"}</p><p className="mt-2 text-sm font-bold text-[#193246]">{p?.title||"Property"}</p><p className="mt-1 text-xs text-[#71838e]">{[p?.locality,p?.city].filter(Boolean).join(", ")}</p></div></div><button disabled={busy===r.id} onClick={()=>void remove(r.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ead8d8] px-4 py-2.5 text-xs font-extrabold text-[#9b4d4d] disabled:opacity-40"><XCircle size={15}/>Remove</button></div>})}</div>}</div>
  <div className="mt-6 rounded-2xl border border-[#dce7eb] bg-[#f7fafb] p-5 text-xs leading-6 text-[#607889]"><strong className="text-[#193246]">Security:</strong> approval controls broker access. Assignments do not transfer property ownership.</div>
 </section>;
}

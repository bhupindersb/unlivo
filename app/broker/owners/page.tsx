"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Copy, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Property={id:string;title:string;city:string;locality:string;listed_by:string;owner_id:string|null;status:string};
type Invitation={id:string;property_id:string;invited_email:string;status:string;created_at:string;message:string|null};

export default function BrokerOwnersPage(){
 const [properties,setProperties]=useState<Property[]>([]);
 const [invitations,setInvitations]=useState<Invitation[]>([]);
 const [selected,setSelected]=useState("");
 const [email,setEmail]=useState("");
 const [note,setNote]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [latestLink,setLatestLink]=useState("");
 const [userId,setUserId]=useState("");
 const load=async()=>{
  setLoading(true);setError("");
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){window.location.href="/login";return}
  setUserId(session.user.id);
  const profile=await supabase.from("profiles").select("role,broker_status,access_status").eq("id",session.user.id).maybeSingle();
  if(profile.data?.role!=="broker"||profile.data?.broker_status!=="approved"||profile.data?.access_status!=="active"){window.location.href="/for-brokers";return}
  const [own,rels,inv]=await Promise.all([
   supabase.from("properties").select("id,title,city,locality,listed_by,owner_id,status").eq("listed_by",session.user.id).order("created_at",{ascending:false}),
   supabase.from("property_broker_relationships").select("property_id").eq("broker_id",session.user.id).eq("relationship_type","listing_representation").eq("status","active"),
   supabase.from("property_owner_invitations").select("id,property_id,invited_email,status,created_at,message").eq("invited_by",session.user.id).order("created_at",{ascending:false})
  ]);
  if(own.error)setError(own.error.message);if(rels.error)setError(rels.error.message);if(inv.error)setError(inv.error.message);
  const ids=Array.from(new Set([...(own.data||[]).map(p=>p.id),...(rels.data||[]).map(r=>r.property_id)]));
  let assigned:Property[]=[];
  if(ids.length){const r=await supabase.from("properties").select("id,title,city,locality,listed_by,owner_id,status").in("id",ids);if(r.error)setError(r.error.message);else assigned=(r.data||[]) as Property[]}
  setProperties(Array.from(new Map([...((own.data||[]) as Property[]),...assigned].map(p=>[p.id,p])).values()));
  setInvitations((inv.data||[]) as Invitation[]);setLoading(false);
 };
 useEffect(()=>{void load()},[]);
 const propertyName=(id:string)=>properties.find(p=>p.id===id)?.title||"Property";
 const invite=async(e:React.FormEvent)=>{
  e.preventDefault();if(!selected||!email.trim())return;
  setBusy(true);setError("");setMessage("");setLatestLink("");
  const r=await supabase.from("property_owner_invitations").insert({property_id:selected,invited_by:userId,invited_email:email.trim().toLowerCase(),message:note.trim()||null}).select("id").single();
  if(r.error){setError(r.error.message)}else{
   const link=window.location.origin+"/owner/invitations?id="+r.data.id;
   setLatestLink(link);setMessage("Invitation created. Copy the secure link and share it with the owner. They must sign in using the invited email address.");
   setEmail("");setNote("");await load();
  }
  setBusy(false);
 };
 const copy=async(link:string)=>{try{await navigator.clipboard.writeText(link);setMessage("Invitation link copied.")}catch{setError("Could not copy automatically. Select and copy the link below.")}};
 const pending=invitations.filter(i=>i.status==="pending");
 if(loading)return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb]"><div className="container py-24 text-center text-sm text-[#687987]">Loading owner invitations…</div></main><SiteFooter/></>;
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-6xl py-10 lg:py-14">
 <a href="/broker" className="inline-flex items-center gap-2 text-sm font-bold text-[#087f73]"><ArrowLeft size={16}/> Broker dashboard</a>
 <div className="mt-6 max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">Owner coordination</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1px]">Invite Property Owners</h1><p className="mt-3 text-sm leading-6 text-[#687987]">Invite the legal owner to claim their property on UNLIVO. Ownership changes only after the invited owner signs in with the same email address and accepts the invitation.</p></div>
 {error&&<div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
 {message&&<div className="mt-6 rounded-xl border border-[#bfe9df] bg-[#effbf8] px-4 py-3 text-sm font-semibold text-[#087f73]">{message}</div>}
 <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
  <form onSubmit={invite} className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9faf6] text-[#087f73]"><Mail size={20}/></div><div><h2 className="text-lg font-extrabold">New owner invitation</h2><p className="text-xs text-[#71838e]">Share an invitation link with the owner.</p></div></div>
   <label className="mt-6 block text-xs font-bold uppercase tracking-[1px] text-[#547083]">Property</label>
   <select required value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d7e3e8] bg-white px-4 text-sm"><option value="">Select a property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title} — {[p.locality,p.city].filter(Boolean).join(", ")}</option>)}</select>
   <label className="mt-5 block text-xs font-bold uppercase tracking-[1px] text-[#547083]">Owner email address</label>
   <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@example.com" className="mt-2 h-12 w-full rounded-xl border border-[#d7e3e8] px-4 text-sm outline-none focus:border-[#0bb89b]"/>
   <label className="mt-5 block text-xs font-bold uppercase tracking-[1px] text-[#547083]">Personal message <span className="font-normal normal-case">(optional)</span></label>
   <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Add a short message for the owner…" className="mt-2 w-full rounded-xl border border-[#d7e3e8] px-4 py-3 text-sm outline-none focus:border-[#0bb89b]"/>
   <button disabled={busy||!selected||!email.trim()} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0bb89b] px-5 text-sm font-extrabold text-white disabled:opacity-50"><Send size={16}/>{busy?"Creating invitation…":"Create owner invitation"}</button>
   {latestLink&&<div className="mt-5 rounded-xl border border-[#cfe9e4] bg-[#f1fbf8] p-4"><p className="text-xs font-bold text-[#087f73]">Share this invitation link</p><p className="mt-2 break-all text-xs text-[#536575]">{latestLink}</p><button type="button" onClick={()=>void copy(latestLink)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#123b53] px-4 py-2 text-xs font-bold text-white"><Copy size={14}/> Copy link</button></div>}
  </form>
  <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Invitation history</h2><p className="mt-1 text-xs text-[#71838e]">{pending.length} awaiting owner response</p></div><button onClick={()=>void load()} className="rounded-lg border border-[#d7e3e8] p-2 text-[#547083]" aria-label="Refresh"><RefreshCw size={16}/></button></div>
   {invitations.length===0?<div className="py-14 text-center"><Building2 size={30} className="mx-auto text-[#0bb89b]"/><p className="mt-3 font-bold">No invitations yet</p><p className="mt-1 text-sm text-[#71838e]">Invitations you create will appear here.</p></div>:<div className="mt-5 divide-y divide-[#edf1f3]">{invitations.map(i=><div key={i.id} className="py-4 first:pt-0"><div className="flex items-center justify-between gap-3"><p className="break-all text-sm font-extrabold">{i.invited_email}</p><span className={"shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase "+(i.status==="accepted"?"bg-[#e9faf6] text-[#087f73]":i.status==="pending"?"bg-[#fff8e7] text-[#8a691f]":"bg-[#eef3f6] text-[#60737e]")}>{i.status}</span></div><p className="mt-1 text-xs text-[#71838e]">{propertyName(i.property_id)} · {new Date(i.created_at).toLocaleDateString("en-IN")}</p>{i.status==="pending"&&<button onClick={()=>void copy(window.location.origin+"/owner/invitations?id="+i.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#087f73]"><Copy size={13}/> Copy invitation link</button>}</div>)}</div>}
  </div>
 </div>
 <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#dfe9ed] bg-white p-5 text-xs leading-6 text-[#607889]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#087f73]"/><p><strong className="text-[#193246]">Ownership protection:</strong> creating an invitation does not change the property owner. The owner must be signed in with the invited email and explicitly accept. The broker remains the listing representative.</p></div>
 </section></main><SiteFooter/></>;
}

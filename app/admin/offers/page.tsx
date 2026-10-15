"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, ChevronDown, Clock3, Eye, HandCoins, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Offer={id:string;property_id:string;buyer_id:string;offer_amount:number;message:string|null;status:string;response_amount:number|null;response_message:string|null;last_action_by:string|null;created_at:string;updated_at:string};
type Property={id:string;title:string;city:string|null;locality:string|null;price:number|null;listed_by:string};
type Event={id:string;offer_id:string;actor_id:string;action:string;amount:number|null;message:string|null;created_at:string};
type Profile={id:string;full_name:string|null;email:string|null;phone:string|null};
type Transaction={id:string;property_id:string;buyer_id:string;seller_id:string;agreed_amount:number|null;status:string};

const statuses=["all","submitted","countered","accepted","declined","withdrawn"];
const statusStyles:Record<string,string>={submitted:"border-[#ead9aa] bg-[#fff8e8] text-[#7a5d12]",countered:"border-[#cbdcf0] bg-[#f1f7fd] text-[#315b91]",accepted:"border-[#b9e4d8] bg-[#eefaf7] text-[#087f73]",declined:"border-[#efcccc] bg-[#fff5f5] text-[#8b4b4b]",withdrawn:"border-[#dfe5e8] bg-[#f5f7f8] text-[#60737e]"};
const money=(v:number|null)=>v==null?"—":`₹ ${Number(v).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const date=(v:string)=>new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const label=(v:string)=>v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function AdminOffersPage(){
 const[allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const[offers,setOffers]=useState<Offer[]>([]),[properties,setProperties]=useState<Property[]>([]),[events,setEvents]=useState<Event[]>([]),[profiles,setProfiles]=useState<Profile[]>([]),[transactions,setTransactions]=useState<Transaction[]>([]);
 const[filter,setFilter]=useState("all"),[search,setSearch]=useState(""),[expanded,setExpanded]=useState("");

 async function load(){
  setLoading(true);setError("");
  const{data:auth}=await supabase.auth.getUser();
  if(!auth.user){window.location.href="/admin/login";return}
  const{data:profile}=await supabase.from("profiles").select("role").eq("id",auth.user.id).maybeSingle();
  if(profile?.role!=="admin"){await supabase.auth.signOut();window.location.href="/admin/login";return}
  setAllowed(true);
  const[o,p,e,t]=await Promise.all([
   supabase.from("property_offers").select("id,property_id,buyer_id,offer_amount,message,status,response_amount,response_message,last_action_by,created_at,updated_at").order("updated_at",{ascending:false}),
   supabase.from("properties").select("id,title,city,locality,price,listed_by"),
   supabase.from("property_offer_events").select("id,offer_id,actor_id,action,amount,message,created_at").order("created_at",{ascending:true}),
   supabase.from("property_transactions").select("id,property_id,buyer_id,seller_id,agreed_amount,status")
  ]);
  if(o.error){setError(o.error.message);setLoading(false);return}
  if(p.error||e.error||t.error)setError((p.error||e.error||t.error)?.message||"Some offer data could not be loaded.");
  const rows=(o.data||[])as Offer[],props=(p.data||[])as Property[],evs=(e.data||[])as Event[],tx=(t.data||[])as Transaction[];
  const ids=Array.from(new Set([...rows.map(x=>x.buyer_id),...props.map(x=>x.listed_by),...evs.map(x=>x.actor_id)].filter(Boolean)));
  let prs:Profile[]=[];
  if(ids.length){const r=await supabase.from("profiles").select("id,full_name,email,phone").in("id",ids);if(r.error)setError(r.error.message);else prs=(r.data||[])as Profile[]}
  setOffers(rows);setProperties(props);setEvents(evs);setProfiles(prs);setTransactions(tx);setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 const propertyFor=(id:string)=>properties.find(x=>x.id===id),profileFor=(id:string)=>profiles.find(x=>x.id===id),eventsFor=(id:string)=>events.filter(x=>x.offer_id===id);
 const counts=useMemo(()=>Object.fromEntries(statuses.map(s=>[s,s==="all"?offers.length:offers.filter(o=>o.status===s).length])),[offers]);
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return offers.filter(o=>{if(filter!=="all"&&o.status!==filter)return false;if(!q)return true;const p=propertyFor(o.property_id),b=profileFor(o.buyer_id),s=p?profileFor(p.listed_by):undefined;return[p?.title,p?.city,p?.locality,b?.full_name,b?.email,s?.full_name,o.status,o.offer_amount,o.response_amount].filter(Boolean).join(" ").toLowerCase().includes(q)})},[offers,filter,search,properties,profiles]);
 const txFor=(o:Offer)=>transactions.find(t=>t.property_id===o.property_id&&t.buyer_id===o.buyer_id);
 if(loading||!allowed)return <section className="px-5 py-24 text-center text-sm text-[#687987]">Loading offer workspace…</section>;
 return <section className="px-5 py-8 lg:px-9 lg:py-10">
  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Admin</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1.5px]">Offers</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#687987]">Monitor property offers, negotiation responses and accepted deals without changing the existing buyer or seller workflow.</p></div><div className="flex items-center gap-2 rounded-2xl border border-[#dfe9ed] bg-white px-4 py-3 text-sm font-bold text-[#315b6e] shadow-sm"><HandCoins size={17} className="text-[#087f73]"/>{counts.all} total offers</div></div>
  {error&&<div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
  <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{statuses.map(s=><button key={s} type="button" onClick={()=>setFilter(s)} className={`rounded-2xl border p-4 text-left transition ${filter===s?"border-[#0bb89b] bg-[#f0fbf8] shadow-sm":"border-[#dfe9ed] bg-white hover:border-[#b9d8d5]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[1.1px] text-[#60737e]">{label(s)}</span><span className="text-2xl font-extrabold text-[#123b53]">{counts[s]||0}</span></div></button>)}</div>
  <div className="mt-7 rounded-3xl border border-[#dfe9ed] bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e6edef] p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6"><div><p className="text-xs font-bold uppercase tracking-[1.4px] text-[#547083]">Offer pipeline</p><h2 className="mt-1 text-2xl font-extrabold">{label(filter)} offers</h2></div><div className="relative w-full lg:max-w-sm"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81929b]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search property, buyer, seller…" className="w-full rounded-xl border border-[#d7e3e8] bg-[#fbfdfd] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0bb89b]"/></div></div>
  {!visible.length?<div className="p-12 text-center"><CheckCircle2 className="mx-auto text-[#0bb89b]" size={34}/><h3 className="mt-4 text-xl font-extrabold">No offers found</h3><p className="mt-2 text-sm text-[#71838e]">There are no offers matching the current filter and search.</p></div>:
  <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead><tr className="border-b border-[#e6edef] bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-[1.25px] text-[#71838e]"><th className="px-6 py-4">Property</th><th className="px-5 py-4">Buyer</th><th className="px-5 py-4">Seller</th><th className="px-5 py-4">Offer / Response</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1f3]">{visible.map(o=>{const p=propertyFor(o.property_id),b=profileFor(o.buyer_id),s=p?profileFor(p.listed_by):undefined,h=eventsFor(o.id),tx=txFor(o),open=expanded===o.id;return <tr key={o.id} className="align-top hover:bg-[#fbfdfd]"><td colSpan={7} className="p-0"><div className="grid grid-cols-[1.45fr_1fr_1fr_1.05fr_.85fr_1fr_1.35fr]">
   <div className="px-6 py-5"><p className="truncate text-sm font-extrabold text-[#123b53]" title={p?.title||"Property"}>{p?.title||"Property"}</p><p className="mt-1 truncate text-xs text-[#71838e]">{[p?.locality,p?.city].filter(Boolean).join(", ")||"Location unavailable"}</p></div>
   <div className="px-5 py-5"><p className="truncate text-sm font-bold text-[#193246]">{b?.full_name||"Buyer"}</p><p className="mt-1 truncate text-[11px] text-[#81929b]">{b?.email||b?.phone||"Contact unavailable"}</p></div>
   <div className="px-5 py-5"><p className="truncate text-sm font-bold text-[#193246]">{s?.full_name||"Seller"}</p><p className="mt-1 truncate text-[11px] text-[#81929b]">{s?.email||s?.phone||"Contact unavailable"}</p></div>
   <div className="px-5 py-5"><p className="text-sm font-extrabold text-[#123b53]">{money(o.offer_amount)}</p><p className="mt-1 text-xs text-[#71838e]">Response: {money(o.response_amount)}</p></div>
   <div className="px-5 py-5"><span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusStyles[o.status]||"border-[#dfe5e8] bg-[#f5f7f8] text-[#60737e]"}`}>{label(o.status)}</span></div>
   <div className="px-5 py-5 text-xs text-[#687987]">{date(o.updated_at)}</div>
   <div className="px-5 py-5"><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>setExpanded(open?"":o.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53]"><ChevronDown size={14} className={open?"rotate-180":""}/>Details</button><a href={`/admin/properties?property=${o.property_id}`} className="inline-flex items-center gap-1 rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53]"><Eye size={14}/>Property</a>{tx&&<a href={`/admin/transactions/${tx.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53]"><ArrowLeftRight size={14}/>Transaction</a>}</div></div>
  </div>{open&&<div className="border-t border-[#e8eef1] bg-[#fbfdfd] px-6 py-6"><div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><div className="space-y-4">
   <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e7eef1]"><p className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#7b8c97]">Offer details</p><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[10px] text-[#81929b]">Original offer</p><p className="mt-1 text-lg font-extrabold">{money(o.offer_amount)}</p></div><div><p className="text-[10px] text-[#81929b]">Current response</p><p className="mt-1 text-lg font-extrabold">{money(o.response_amount)}</p></div></div>{o.message&&<div className="mt-4 rounded-xl bg-[#f7fafb] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.8px] text-[#81929b]">Buyer message</p><p className="mt-1 text-sm leading-5 text-[#536a77]">{o.message}</p></div>}{o.response_message&&<div className="mt-3 rounded-xl bg-[#eefaf7] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.8px] text-[#52786f]">Latest response</p><p className="mt-1 text-sm leading-5 text-[#52786f]">{o.response_message}</p></div>}</div>
   <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e7eef1]"><p className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#7b8c97]">Participants</p><div className="mt-3 space-y-3"><div><p className="text-[10px] uppercase tracking-[.8px] text-[#81929b]">Buyer</p><p className="mt-1 text-sm font-bold">{b?.full_name||"Buyer"}</p><p className="text-xs text-[#71838e]">{b?.email||b?.phone||"Contact unavailable"}</p></div><div className="border-t border-[#edf1f3] pt-3"><p className="text-[10px] uppercase tracking-[.8px] text-[#81929b]">Seller</p><p className="mt-1 text-sm font-bold">{s?.full_name||"Seller"}</p><p className="text-xs text-[#71838e]">{s?.email||s?.phone||"Contact unavailable"}</p></div></div></div>
   </div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e7eef1]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#7b8c97]">Negotiation history</p><p className="mt-1 text-sm font-extrabold">{h.length} recorded event{h.length===1?"":"s"}</p></div><Clock3 size={18} className="text-[#0bb89b]"/></div><div className="mt-4 space-y-2">{h.map(e=>{const a=profileFor(e.actor_id);return <div key={e.id} className="rounded-xl bg-[#f7fafb] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-[.8px] text-[#547083]">{label(e.action)}</p><p className="text-[11px] text-[#7b8c97]">{date(e.created_at)}</p></div><p className="mt-1 text-sm font-bold text-[#193246]">{e.amount!=null?money(e.amount):"—"} <span className="font-normal text-[#687987]">· {a?.full_name||"UNLIVO user"}</span></p>{e.message&&<p className="mt-1 text-sm leading-5 text-[#687987]">{e.message}</p>}</div>)}{!h.length&&<p className="py-5 text-sm text-[#71838e]">No negotiation events recorded.</p>}</div></div></div></div>}</td></tr>})}</tbody></table></div>}
  </div>
 </section>;
}
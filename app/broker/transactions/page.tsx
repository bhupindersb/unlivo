"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { ArrowRight, Clock3, Search, ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Tx={id:string;property_id:string;buyer_id:string;seller_id:string;agreed_amount:number;due_amount:number|null;status:string;started_at:string;updated_at:string;buyer_confirmed_at:string|null;seller_confirmed_at:string|null};
type Property={id:string;title:string;city:string;locality:string};
type Person={id:string;full_name:string|null};
type Row=Tx & {property?:Property;buyer?:Person;seller?:Person};
const money=(v:number|null)=>v==null?"—":`₹ ${Number(v).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const statusClass=(s:string)=>s==="completed"?"bg-[#e9faf6] text-[#087f73]":s==="cancelled"?"bg-[#fff2f2] text-[#a24646]":s==="in_progress"?"bg-[#eef5ff] text-[#315b91]":"bg-[#fff8ee] text-[#9a6410]";

export default function BrokerTransactionsPage(){
 const[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState("all");
 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/login";return;}
  const {data:profile}=await supabase.from("profiles").select("role,access_status,broker_status").eq("id",user.id).maybeSingle();
  if(profile?.role!=="broker"||profile.access_status!=="active"||profile.broker_status!=="approved"){window.location.href="/for-brokers";return;}
  const {data:tx,error:txError}=await supabase.from("property_transactions").select("id,property_id,buyer_id,seller_id,agreed_amount,due_amount,status,started_at,updated_at,buyer_confirmed_at,seller_confirmed_at").order("updated_at",{ascending:false});
  if(txError){setError(txError.message);setLoading(false);return;}
  const values=(tx||[]) as Tx[];const pids=[...new Set(values.map(x=>x.property_id))];const uids=[...new Set(values.flatMap(x=>[x.buyer_id,x.seller_id]))];
  const [p,u]=await Promise.all([pids.length?supabase.from("properties").select("id,title,city,locality").in("id",pids):Promise.resolve({data:[],error:null}),uids.length?supabase.from("profiles").select("id,full_name").in("id",uids):Promise.resolve({data:[],error:null})]);
  if(p.error||u.error)setError((p.error||u.error)?.message||"Some details could not be loaded.");
  const pm=new Map((p.data||[]).map(x=>[x.id,x as Property])),um=new Map((u.data||[]).map(x=>[x.id,x as Person]));
  setRows(values.map(x=>({...x,property:pm.get(x.property_id),buyer:um.get(x.buyer_id),seller:um.get(x.seller_id)})));setLoading(false);
 })()},[]);
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return rows.filter(r=>(status==="all"||r.status===status)&&(!q||[r.property?.title,r.property?.city,r.property?.locality,r.buyer?.full_name,r.seller?.full_name,r.id].filter(Boolean).join(" ").toLowerCase().includes(q)))},[rows,search,status]);
 const active=rows.filter(x=>x.status==="initiated"||x.status==="in_progress").length;
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-7xl py-10 lg:py-14">
 <a href="/broker" className="text-sm font-bold text-[#547083]">← Broker workspace</a>
 <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">Broker Workspace</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1px]">Transactions</h1><p className="mt-2 text-sm text-[#687987]">Follow the transaction progress for properties you actively represent.</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-[#e9faf6] px-4 py-3 text-xs font-bold text-[#087f73]"><ShieldCheck size={16}/> Broker access</span></div>
 {error&&<div className="mt-5 rounded-xl border border-[#efd0d0] bg-[#fff7f7] p-3 text-sm text-[#8b4b4b]">{error}</div>}
 <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[#dfe9ed] bg-white p-5"><p className="text-3xl font-extrabold">{rows.length}</p><p className="mt-1 text-xs font-bold text-[#71838e]">Visible transactions</p></div><div className="rounded-2xl border border-[#dfe9ed] bg-white p-5"><p className="text-3xl font-extrabold">{active}</p><p className="mt-1 text-xs font-bold text-[#71838e]">Active transactions</p></div><div className="rounded-2xl border border-[#dfe9ed] bg-white p-5"><p className="text-3xl font-extrabold">{rows.filter(x=>x.status==="completed").length}</p><p className="mt-1 text-xs font-bold text-[#71838e]">Completed</p></div></div>
 <div className="mt-6 rounded-3xl border border-[#dfe9ed] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-4 top-3.5 text-[#8a9aa4]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search property, buyer, seller or ID" className="h-11 w-full rounded-xl border border-[#d7e3e8] pl-11 pr-4 text-sm outline-none focus:border-[#0bb89b]"/></div><select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-xl border border-[#d7e3e8] bg-white px-4 text-sm font-semibold"><option value="all">All statuses</option><option value="initiated">Initiated</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
 {loading?<p className="py-16 text-center text-sm text-[#71838e]">Loading transactions…</p>:filtered.length===0?<p className="py-16 text-center text-sm text-[#71838e]">No transactions are available for your assigned listings.</p>:<div className="mt-4 divide-y divide-[#edf1f3]">{filtered.map(r=><div key={r.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusClass(r.status)}`}>{r.status.replaceAll("_"," ")}</span><span className="text-[11px] text-[#8a9aa4]">Updated {new Date(r.updated_at).toLocaleDateString("en-IN")}</span></div><h2 className="mt-2 text-base font-extrabold">{r.property?.title||"Property transaction"}</h2><p className="mt-1 text-xs text-[#71838e]">{[r.property?.locality,r.property?.city].filter(Boolean).join(", ")}</p><p className="mt-2 text-sm text-[#526b7a]">Buyer: {r.buyer?.full_name||"Buyer"} · Seller: {r.seller?.full_name||"Seller"}</p><p className="mt-1 text-sm font-extrabold">{money(r.agreed_amount)}</p><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#71838e]"><span className="inline-flex items-center gap-1"><Clock3 size={13}/> Buyer {r.buyer_confirmed_at?"confirmed":"pending"}</span><span>Seller {r.seller_confirmed_at?"confirmed":"pending"}</span></div></div><a href={`/broker/transactions/${r.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#123b53] px-4 py-3 text-sm font-bold text-white">View transaction <ArrowRight size={15}/></a></div>)}</div>}</div>
 </section></main><SiteFooter/></>;
}

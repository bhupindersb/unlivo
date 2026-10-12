"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Eye, Filter, HandCoins, Search, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Transaction={id:string;property_id:string;buyer_id:string;seller_id:string;agreed_amount:number;due_amount:number|null;status:"initiated"|"in_progress"|"completed"|"cancelled";started_at:string;completed_at:string|null;cancelled_at:string|null;buyer_confirmed_at:string|null;seller_confirmed_at:string|null;updated_at:string};
type Property={id:string;title:string|null;city:string|null;locality:string|null;status:string};
type Profile={id:string;full_name:string|null};
type Row=Transaction & {property?:Property;buyer?:Profile;seller?:Profile};

const money=(v:number|null)=>v==null?"—":`₹ ${Number(v).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const statusLabel=(s:string)=>s==="initiated"?"Initiated":s==="in_progress"?"In Progress":s==="completed"?"Completed":"Cancelled";
const statusClass=(s:string)=>s==="completed"?"bg-[#e9faf6] text-[#087f73]":s==="cancelled"?"bg-[#fff2f2] text-[#a24646]":s==="in_progress"?"bg-[#eef5ff] text-[#315b91]":"bg-[#fff8ee] text-[#9a6410]";

export default function AdminTransactionsPage(){
  const[rows,setRows]=useState<Row[]>([]);
  const[loading,setLoading]=useState(true);
  const[allowed,setAllowed]=useState(false);
  const[error,setError]=useState("");
  const[status,setStatus]=useState("all");
  const[search,setSearch]=useState("");

  useEffect(()=>{(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/admin/login";return;}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(!profile||!["admin","reviewer"].includes(profile.role)){window.location.href="/admin/login";return;}
    setAllowed(true);
    const {data:tx,error:txError}=await supabase.from("property_transactions").select("id,property_id,buyer_id,seller_id,agreed_amount,due_amount,status,started_at,completed_at,cancelled_at,buyer_confirmed_at,seller_confirmed_at,updated_at").order("updated_at",{ascending:false});
    if(txError){setError(txError.message);setLoading(false);return;}
    const list=(tx||[]) as Transaction[];
    const ids=[...new Set(list.flatMap(x=>[x.buyer_id,x.seller_id]))];
    const propertyIds=[...new Set(list.map(x=>x.property_id))];
    const [p,people]=await Promise.all([
      propertyIds.length?supabase.from("properties").select("id,title,city,locality,status").in("id",propertyIds):Promise.resolve({data:[],error:null}),
      ids.length?supabase.from("profiles").select("id,full_name").in("id",ids):Promise.resolve({data:[],error:null})
    ]);
    if(p.error||people.error)setError((p.error||people.error)?.message||"Some transaction details could not be loaded.");
    const pm=new Map((p.data||[]).map(x=>[x.id,x as Property]));
    const um=new Map((people.data||[]).map(x=>[x.id,x as Profile]));
    setRows(list.map(x=>({...x,property:pm.get(x.property_id),buyer:um.get(x.buyer_id),seller:um.get(x.seller_id)})));
    setLoading(false);
  })()},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return rows.filter(r=>(status==="all"||r.status===status)&&(!q||[r.property?.title,r.property?.city,r.property?.locality,r.buyer?.full_name,r.seller?.full_name,r.id].filter(Boolean).join(" ").toLowerCase().includes(q)));
  },[rows,status,search]);

  const metrics={total:rows.length,active:rows.filter(x=>x.status==="initiated"||x.status==="in_progress").length,completed:rows.filter(x=>x.status==="completed").length,cancelled:rows.filter(x=>x.status==="cancelled").length,waiting:rows.filter(x=>(x.status==="initiated"||x.status==="in_progress")&&(!x.buyer_confirmed_at||!x.seller_confirmed_at)).length};

  if(loading||!allowed)return <section className="min-w-0 flex-1 px-5 py-10 lg:px-9"><div className="flex min-h-[50vh] items-center justify-center text-sm text-[#607889]">Loading secure transaction operations…</div></section>;

  return <section className="min-w-0 flex-1 px-5 py-8 lg:px-9 lg:py-10">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Operations</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] text-[#071d2d] lg:text-4xl">Transaction Management</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#607889]">Monitor active property transactions, payment progress, confirmations and completed deals.</p></div>
      <div className="inline-flex items-center gap-2 rounded-xl bg-[#eaf7f4] px-4 py-3 text-xs font-bold text-[#087f73]"><ShieldCheck size={16}/> Admin & reviewer access</div>
    </div>
    {error&&<div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[[`Total transactions`,metrics.total],[`Active`,metrics.active],[`Waiting for confirmation`,metrics.waiting],[`Completed`,metrics.completed],[`Cancelled`,metrics.cancelled]].map(([label,value])=><div key={label} className="rounded-2xl border border-[#dce7eb] bg-white p-5 shadow-sm"><p className="text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs font-semibold text-[#71838e]">{label}</p></div>)}
    </div>
    <div className="mt-6 rounded-3xl border border-[#dce7eb] bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1"><Search size={17} className="absolute left-4 top-3.5 text-[#8a9aa4]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search property, buyer, seller or transaction ID" className="h-11 w-full rounded-xl border border-[#d7e3e8] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#0bb89b]"/></div>
        <div className="flex items-center gap-2"><Filter size={16} className="text-[#71838e]"/><select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-xl border border-[#d7e3e8] bg-white px-4 text-sm font-semibold outline-none"><option value="all">All statuses</option><option value="initiated">Initiated</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-[#e8eef1] text-[10px] uppercase tracking-[1.5px] text-[#8a9aa4]"><th className="px-3 py-3">Property</th><th className="px-3 py-3">Buyer</th><th className="px-3 py-3">Seller</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Confirmations</th><th className="px-3 py-3">Updated</th><th className="px-3 py-3"></th></tr></thead><tbody>{filtered.map(r=><tr key={r.id} className="border-b border-[#edf1f3] last:border-0 hover:bg-[#fbfcfd]"><td className="px-3 py-4"><p className="max-w-[220px] truncate text-sm font-bold">{r.property?.title||"Property unavailable"}</p><p className="mt-1 text-[11px] text-[#71838e]">{[r.property?.locality,r.property?.city].filter(Boolean).join(", ")||"Location unavailable"}</p></td><td className="px-3 py-4 text-sm font-semibold">{r.buyer?.full_name||"Buyer"}</td><td className="px-3 py-4 text-sm font-semibold">{r.seller?.full_name||"Seller"}</td><td className="px-3 py-4 text-sm font-extrabold">{money(r.agreed_amount)}</td><td className="px-3 py-4"><span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusClass(r.status)}`}>{statusLabel(r.status)}</span></td><td className="px-3 py-4"><div className="flex gap-1.5"><span title="Buyer confirmation" className={`flex h-7 w-7 items-center justify-center rounded-full ${r.buyer_confirmed_at?"bg-[#e9faf6] text-[#087f73]":"bg-[#f3f7f8] text-[#9aa7ae]"}`}>{r.buyer_confirmed_at?<CheckCircle2 size={15}/>:<Clock3 size={15}/>}</span><span title="Seller confirmation" className={`flex h-7 w-7 items-center justify-center rounded-full ${r.seller_confirmed_at?"bg-[#e9faf6] text-[#087f73]":"bg-[#f3f7f8] text-[#9aa7ae]"}`}>{r.seller_confirmed_at?<CheckCircle2 size={15}/>:<Clock3 size={15}/>}</span></div></td><td className="px-3 py-4 text-xs text-[#71838e]">{new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(r.updated_at))}</td><td className="px-3 py-4 text-right"><a href={`/transactions/${r.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbdde3] px-3 py-2 text-xs font-bold text-[#123b53] hover:bg-[#f1f8f7]"><Eye size={14}/>View</a></td></tr>)}</tbody></table>{filtered.length===0&&<div className="py-12 text-center"><HandCoins className="mx-auto text-[#a0afb7]" size={28}/><p className="mt-3 text-sm font-bold text-[#607889]">No transactions match your filters.</p></div>}</div>
    </div>
  </section>;
}

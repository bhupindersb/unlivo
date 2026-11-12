"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Property={id:string;title:string;city:string;locality:string;purpose:string;status:string;price:number|null;rent_monthly:number|null;created_at:string};

export default function OwnerDashboard(){
 const [properties,setProperties]=useState<Property[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{void(async()=>{const{data:{session}}=await supabase.auth.getSession();if(!session?.user){window.location.href="/login?next=%2Fowner";return}const r=await supabase.from("properties").select("id,title,city,locality,purpose,status,price,rent_monthly,created_at").eq("owner_id",session.user.id).order("created_at",{ascending:false});if(r.error)setError(r.error.message);else setProperties((r.data||[]) as Property[]);setLoading(false)})()},[]);
 const money=(p:Property)=>p.purpose==="rent"?(p.rent_monthly?"₹ "+Number(p.rent_monthly).toLocaleString("en-IN")+"/month":"Rent on request"):(p.price?"₹ "+Number(p.price).toLocaleString("en-IN"):"Price on request");
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-6xl py-10 lg:py-14"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Owner Workspace</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1px]">My Properties</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">Properties associated with you as the owner. Your appointed broker can continue to manage the listing separately.</p>{error&&<div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm text-[#8b4b4b]">{error}</div>}{loading?<div className="py-20 text-center text-sm text-[#687987]">Loading your properties…</div>:properties.length===0?<div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-12 text-center"><Building2 size={34} className="mx-auto text-[#0bb89b]"/><h2 className="mt-4 text-lg font-extrabold">No properties linked yet</h2><p className="mt-2 text-sm text-[#71838e]">When you accept an owner invitation, the property will appear here.</p></div>:<div className="mt-8 grid gap-4 md:grid-cols-2">{properties.map(p=><article key={p.id} className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e9faf6] px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] text-[#087f73]"><ShieldCheck size={12} className="mr-1 inline"/>Owner linked</span><span className="text-xs font-bold text-[#71838e]">{p.status.replaceAll("_"," ")}</span></div><h2 className="mt-4 text-xl font-extrabold">{p.title}</h2><p className="mt-1 text-sm text-[#687987]">{[p.locality,p.city].filter(Boolean).join(", ")}</p><p className="mt-3 text-sm font-extrabold">{money(p)}</p><a href={"/properties/"+p.id} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#087f73]">View property <ArrowRight size={15}/></a></article>)}</div>}</section></main><SiteFooter/></>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Crown, RefreshCw, ShieldCheck } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Plan = { id:string; code:string; name:string; monthly_price_paise:number; annual_price_paise:number; active_listing_limit:number; sort_order:number };
type Subscription = { id:string; status:string; billing_cycle:string|null; base_amount_paise:number; discount_percent:number; amount_paid_paise:number; current_period_start:string; current_period_end:string|null; renewal_due_at:string|null; plan_id:string };
type Founder = { slot_number:number; discount_percent:number; assigned_at:string; discount_ends_at:string };

const money=(paise:number)=>"₹"+(paise/100).toLocaleString("en-IN",{minimumFractionDigits:paise%100?2:0,maximumFractionDigits:2});
const date=(value:string|null)=>value?new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—";
const activeStatuses=["published","offer_received","under_offer"];

export default function BrokerSubscriptionPage(){
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[plans,setPlans]=useState<Plan[]>([]);
 const[sub,setSub]=useState<Subscription|null>(null);
 const[founder,setFounder]=useState<Founder|null>(null);
 const[activeCount,setActiveCount]=useState(0);
 const[brokerName,setBrokerName]=useState("Broker");

 useEffect(()=>{void load()},[]);
 async function load(){
  setLoading(true);setError("");
  try {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){window.location.assign("/login");return}
  const uid=session.user.id;
  const profile=await supabase.from("profiles").select("role,full_name,broker_status,access_status").eq("id",uid).maybeSingle();
  if(profile.error)throw new Error(profile.error.message);
  if(profile.data?.role!=="broker"||profile.data?.broker_status!=="approved"||profile.data?.access_status!=="active"){window.location.assign("/for-brokers");return}
  setBrokerName(profile.data.full_name||"Broker");
  const [planResult,subResult,founderResult,countResult]=await Promise.all([
   supabase.from("broker_plans").select("id,code,name,monthly_price_paise,annual_price_paise,active_listing_limit,sort_order").eq("is_active",true).order("sort_order"),
   supabase.from("broker_subscriptions").select("id,status,billing_cycle,base_amount_paise,discount_percent,amount_paid_paise,current_period_start,current_period_end,renewal_due_at,plan_id").eq("broker_id",uid).eq("status","active").order("created_at",{ascending:false}).limit(1).maybeSingle(),
   supabase.from("broker_founder_slots").select("slot_number,discount_percent,assigned_at,discount_ends_at").eq("broker_id",uid).maybeSingle(),
   supabase.from("properties").select("id",{count:"exact",head:true}).eq("listed_by",uid).in("status",activeStatuses)
  ]);
  if(planResult.error)throw new Error(planResult.error.message);
  if(subResult.error)throw new Error(subResult.error.message);
  if(founderResult.error)throw new Error(founderResult.error.message);
  if(countResult.error)throw new Error(countResult.error.message);
  setPlans((planResult.data||[]) as Plan[]);
  setSub(subResult.data as Subscription|null);
  setFounder(founderResult.data as Founder|null);
  setActiveCount(countResult.count||0);
  setLoading(false);
  } catch (e:any) { setError(e?.message || "Unable to load your subscription."); setLoading(false); }
 }
 const currentPlan=useMemo(()=>plans.find(p=>p.id===sub?.plan_id)||plans.find(p=>p.code==="starter"),[plans,sub]);
 const discountActive=!!founder&&new Date(founder.discount_ends_at)>new Date();
 if(loading)return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] py-24 text-center text-sm text-[#687987]">Loading your subscription…</main><SiteFooter/></>;
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-6xl py-10 lg:py-14">
  <a href="/broker" className="inline-flex items-center gap-2 text-sm font-bold text-[#087f73]"><ArrowLeft size={16}/> Broker workspace</a>
  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">Broker account</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1px]">My Subscription</h1><p className="mt-3 text-sm text-[#687987]">Manage your UNLIVO plan, listing allowance and billing details.</p></div><button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-sm font-bold"><RefreshCw size={15}/> Refresh</button></div>
  {error&&<div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm text-[#8b4b4b]">{error}</div>}
  <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
   <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-[1.5px] text-[#71838e]">Current plan</p><span className="rounded-full bg-[#e9faf6] px-3 py-1 text-[10px] font-extrabold uppercase text-[#087f73]">{sub?.status||"Starter"}</span></div><h2 className="mt-3 text-3xl font-extrabold">{currentPlan?.name||"Starter"}</h2><p className="mt-1 text-sm text-[#687987]">{currentPlan?.code==="starter"?"No subscription payment required":"Paid membership"}</p><div className="mt-7"><div className="flex items-end justify-between"><span className="text-sm font-bold">Active properties</span><strong className="text-lg">{activeCount} / {currentPlan?.active_listing_limit??3}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eaf0f2]"><div className="h-full rounded-full bg-[#0bb89b]" style={{width:`${Math.min(100,activeCount/Math.max(1,currentPlan?.active_listing_limit??3)*100)}%`}}/></div><p className="mt-2 text-xs text-[#71838e]">Published, offer received and under-offer listings count toward your allowance.</p></div><div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#edf1f3] pt-5"><div><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#71838e]">Started</p><p className="mt-1 text-sm font-bold">{date(sub?.current_period_start||null)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#71838e]">Renewal / expiry</p><p className="mt-1 text-sm font-bold">{date(sub?.current_period_end||null)}</p></div></div></section>
   <section className="rounded-3xl border border-[#cfe9e4] bg-[#f1fbf8] p-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#087f73]"><Crown size={21}/></div><div><p className="text-xs font-extrabold uppercase tracking-[1.5px] text-[#087f73]">Founding Broker Programme</p><h2 className="mt-1 text-xl font-extrabold">{founder?(`Founding Broker #${founder.slot_number}`):"Early broker access"}</h2></div></div>{founder?<><p className="mt-5 text-sm leading-6 text-[#45616d]">You are eligible for a <strong>{founder.discount_percent}% discount</strong> on paid plans until {date(founder.discount_ends_at)}. The discount applies when a paid plan is activated during this eligibility period.</p><p className="mt-3 text-xs text-[#607889]">Enrolled: {date(founder.assigned_at)} · {discountActive?"Discount currently active":"Discount period ended"}</p></>:<p className="mt-5 text-sm leading-6 text-[#45616d]">The first 25 approved brokers receive a 50% discount on paid plans for 12 months from approval. Founding places are allocated automatically when Admin approves broker applications.</p>}<div className="mt-6 flex items-start gap-2 rounded-xl bg-white/80 p-4 text-xs leading-5 text-[#607889]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#087f73]"/>Your broker approval controls platform access. It does not represent independent verification of property ownership or title.</div></section>
  </div>
  <div className="mt-10"><div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">Plans and pricing</p><h2 className="mt-2 text-2xl font-extrabold">Choose room to grow</h2><p className="mt-2 text-sm text-[#687987]">Annual billing is priced at ten monthly payments. There is no free trial.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map(p=>{const isCurrent=p.id===currentPlan?.id;const m=discountActive&&p.code!=="starter"?Math.round(p.monthly_price_paise*0.5):p.monthly_price_paise;const a=discountActive&&p.code!=="starter"?Math.round(p.annual_price_paise*0.5):p.annual_price_paise;return <article key={p.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${p.code==="growth"?"border-[#0bb89b] ring-1 ring-[#0bb89b]":"border-[#dfe9ed]"}`}><div className="flex items-center justify-between"><h3 className="text-lg font-extrabold">{p.name}</h3>{isCurrent&&<span className="rounded-full bg-[#e9faf6] px-2 py-1 text-[9px] font-extrabold uppercase text-[#087f73]">Current</span>}</div><p className="mt-4 text-3xl font-extrabold">{p.monthly_price_paise===0?"Free":money(m)}<span className="ml-1 text-xs font-semibold text-[#71838e]">{p.monthly_price_paise===0?"forever":"/ month"}</span></p>{p.monthly_price_paise>0&&<p className="mt-1 text-xs text-[#71838e]">Annual: {money(a)} / year</p>}{discountActive&&p.monthly_price_paise>0&&<p className="mt-2 text-xs font-bold text-[#087f73]">50% Founding Broker discount applied</p>}<div className="my-5 h-px bg-[#edf1f3]"/><p className="text-2xl font-extrabold">{p.active_listing_limit}</p><p className="text-xs text-[#71838e]">Active properties</p><p className="mt-5 text-xs leading-5 text-[#607889]">{p.code==="starter"?"Essential property listing access.":p.code==="solo"?"For independent brokers managing a growing portfolio.":p.code==="growth"?"For brokers managing a larger active inventory.":"For established agencies with substantial inventory."}</p><button disabled className="mt-6 w-full cursor-not-allowed rounded-xl bg-[#eaf0f2] px-4 py-3 text-xs font-extrabold text-[#607889]">{isCurrent?"Current plan":"Paid upgrades coming soon"}</button></article>})}</div></div>
  <p className="mt-8 rounded-2xl border border-[#dfe9ed] bg-white p-5 text-xs leading-6 text-[#71838e]">UNLIVO will use manual renewals. Paid-plan checkout and renewal activation will be enabled after Razorpay order creation, server-side signature verification and payment-webhook handling are implemented. No payment is collected from this page yet.</p>
 </section></main><SiteFooter/></>;
}

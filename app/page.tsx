"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, Heart, Handshake, Home, MapPin, ShieldCheck, Users } from "lucide-react";
import PropertySearch from "../components/property-search";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { supabase } from "../lib/supabase";

type Property={id:string;title:string;city:string;locality:string;price:number|null;rent_monthly:number|null;bedrooms:number|null;bathrooms:number|null;area_sqft:number|null;purpose:string;featured:boolean;cover?:string};
function price(p:Property){if(p.purpose==="rent")return p.rent_monthly==null?"Rent on request":`₹ ${p.rent_monthly.toLocaleString("en-IN")}/month`;if(p.price==null)return "Price on request";return p.price>=10000000?`₹ ${(p.price/10000000).toFixed(2)} Cr`:`₹ ${(p.price/100000).toFixed(2)} Lakh`}
export default function HomePage(){
 const [properties,setProperties]=useState<Property[]>([]);
 useEffect(()=>{async function load(){if(!supabase)return;const r=await supabase.from("properties").select("id,title,city,locality,price,rent_monthly,bedrooms,bathrooms,area_sqft,purpose,featured,property_media(storage_path,sort_order,is_cover)").eq("status","published").order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(4);if(!r.error){const mapped=(r.data||[]).map((p:any)=>{const media=[...(p.property_media||[])].sort((a:any,b:any)=>(a.is_cover?0:1)-(b.is_cover?0:1)||a.sort_order-b.sort_order);const cover=media[0]?.storage_path?supabase!.storage.from("property-media").getPublicUrl(media[0].storage_path).data.publicUrl:undefined;return {...p,cover}});setProperties(mapped as Property[])}}load()},[]);
 return <main><SiteHeader overlay/><section className="hero-bg relative overflow-hidden pt-24 sm:pt-28">
  <div className="container relative grid min-h-[610px] items-center gap-10 pb-16 pt-8 lg:grid-cols-[1fr_1fr] lg:pb-20">
    <div className="relative z-10">
      <p className="mb-5 text-[10px] font-bold uppercase tracking-[3px] text-[#087f73] sm:text-[11px]">A smarter way to find your property</p>
      <h1 className="max-w-[650px] text-[46px] font-extrabold leading-[1.02] tracking-[-2.8px] text-[#102638] sm:text-[60px]">You tell us what you need. <span className="text-[#08b99e]">We find your match.</span></h1>
      <p className="mt-6 max-w-[535px] text-[15px] leading-7 text-[#536575] sm:text-[17px]">Stop searching through endless listings. Share your budget, preferred locations and the kind of property you want. UNLIVO matches your requirement with relevant properties and connects you with the people behind them.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/post-requirement" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#071d2d] px-6 py-4 text-[13px] font-bold text-white shadow-lg transition hover:bg-[#102f44]">Post Your Requirement <ArrowRight size={17}/></a>
        <a href="/properties" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#9caeb9] bg-white/75 px-6 py-4 text-[13px] font-bold text-[#102638]">Browse Properties</a>
      </div>
      <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-semibold text-[#536575]">
        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#08a98f}"/>Tell us what you want</span>
        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#08a98f}"/>Get relevant matches</span>
        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#08a98f}"/>Connect with confidence</span>
      </div>
    </div>
    <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
      <div className="absolute -right-5 -top-7 h-40 w-40 rounded-full bg-[#b9eee4]/70 blur-3xl"/>
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(7,29,45,0.14)] backdrop-blur sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#0a9d87]">Step 1</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.5px] text-[#102638]">Tell us what you're looking for</h2></div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8faf5] text-[#08a98f]"><Home size={22}/></div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-[#e4ecef] bg-[#f8fbfc] p-4"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7b8994]">Property type</p><p className="mt-1 font-bold text-[#173246]">3 BHK Apartment</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e4ecef] bg-[#f8fbfc] p-4"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7b8994]">Preferred location</p><p className="mt-1 text-sm font-bold text-[#173246]">Mohali / Chandigarh</p></div>
            <div className="rounded-xl border border-[#e4ecef] bg-[#f8fbfc] p-4"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7b8994]">Your budget</p><p className="mt-1 text-sm font-bold text-[#173246]">₹80L – ₹1.2Cr</p></div>
          </div>
        </div>
        <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-[#e5edef]"/><span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#0a9d87]">Then UNLIVO matches</span><div className="h-px flex-1 bg-[#e5edef]"/></div>
        <div className="rounded-2xl bg-[#071d2d] p-4 text-white sm:p-5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13c6a3]/15 text-[#43e0c0]"><CheckCircle2 size={21}/></div><div><p className="font-bold">Relevant properties, brought to you</p><p className="mt-1 text-[11px] text-white/65">Matches based on the needs you share</p></div></div>
          <div className="mt-4 flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-white/15"><div className="h-1.5 w-4/5 rounded-full bg-[#13c6a3]"/></div><span className="text-[10px] font-semibold text-[#8cebd8]">Your needs come first</span></div>
        </div>
        <p className="mt-4 text-center text-[10px] text-[#81909a]">Illustrative example · Your matches depend on your requirement</p>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-white bg-white px-4 py-3 shadow-xl sm:block"><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#0a9d87]">UNLIVO approach</p><p className="mt-1 text-sm font-extrabold text-[#102638]">Your requirement. Your matches.</p></div>
    </div>
  </div>
</section>
<section id="search" className="container pb-16 pt-12">
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#547083]">Already know what you want to browse?</p><h2 className="mt-1 text-2xl font-extrabold tracking-[-.7px] text-[#102638]">Explore available properties</h2></div><a href="/post-requirement" className="text-[12px] font-bold text-[#087f73]">Prefer a match? Post your requirement <ArrowRight className="ml-1 inline" size={14}/></a></div>
  <PropertySearch />
</section>
 <section id="how-it-works" className="bg-white py-20 sm:py-24">
  <div className="container">
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#087f73] sm:text-[11px]">A simpler property journey</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-[-1.2px] text-[#102638] sm:text-4xl">How UNLIVO Works</h2>
      <p className="mt-4 text-sm leading-7 text-[#647583] sm:text-base">From the first search to the right connection, we make every step clearer. Start with what you need — not endless scrolling through listings.</p>
    </div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <HowStep number="01" icon={<Home size={22}/>} title="Share your requirement" text="Tell us the property type, preferred locations, budget and the details that matter to you."/>
      <HowStep number="02" icon={<CheckCircle2 size={22}/>} title="Discover relevant matches" text="Explore suitable properties and opportunities that align with the needs you have shared."/>
      <HowStep number="03" icon={<Users size={22}/>} title="Connect with the right people" text="Reach out to owners and brokers to ask questions, request details and arrange a visit."/>
      <HowStep number="04" icon={<Handshake size={22}/>} title="Move forward with confidence" text="Compare your options, discuss the next steps and progress at your own pace."/>
    </div>
    <div className="mt-10 flex justify-center">
      <a href="/post-requirement" className="inline-flex items-center gap-2 rounded-lg bg-[#071d2d] px-6 py-3.5 text-[13px] font-bold text-white transition hover:bg-[#102f44]">Start with your requirement <ArrowRight size={16}/></a>
    </div>
  </div>
 </section>
 <section className="container pb-24"><div className="mb-8 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[3px] text-[#547083] sm:text-[11px]">Featured Properties</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-1px] text-[#102638]">Latest on UNLIVO</h2></div><a href="/properties" className="hidden cursor-pointer items-center gap-2 text-[13px] font-bold text-[#087f73] sm:flex">View All Properties <ArrowRight size={16}/></a></div>{properties.length===0?<div className="rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center text-sm text-[#687987]">New published UNLIVO listings will appear here automatically.</div>:<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{properties.map(p=><PropertyCard key={p.id} p={p}/>)}</div>}</section>
 <section id="brokers" className="bg-[#f1fbf9] py-20"><div className="container grid gap-10 lg:grid-cols-[1fr_1.1fr_.85fr] lg:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[3px] text-[#547083] sm:text-[11px]">Why UNLIVO</p><h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-[-1.5px] text-[#102638]">Real Estate Works<br/>Better Together</h2><p className="mt-5 max-w-[450px] leading-7 text-[#5c6e7c]">We’re building a trusted, technology-driven platform that connects people, properties and opportunities across India.</p></div><div className="space-y-5"><Benefit icon={<ShieldCheck/>} title="Verified Listings" text="Genuine properties, verified sources"/><Benefit icon={<CheckCircle2/>} title="Smart Matching" text="Connect with the right people faster"/><Benefit icon={<MapPin/>} title="Location Intelligence" text="Search properties with better geographic context"/><Benefit icon={<Users/>} title="Built for Brokers" text="Tools to grow your business"/></div><div className="relative min-h-[350px] overflow-hidden rounded-2xl"><img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=90" alt="Modern city skyline" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[#071d2d]/55"/><div className="relative p-8 text-white"><p className="max-w-[220px] text-2xl font-light uppercase tracking-[2px]">India’s Property Potential Unlocked</p></div></div></div></section>
 <section className="bg-[#071d2d] py-16 text-white"><div className="container flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-3xl font-extrabold tracking-[-1px]">Be Part of a More Connected<br/>Real Estate Future</h2><p className="mt-3 max-w-[650px] text-sm leading-6 text-white/65">Whether you’re a buyer, owner or broker — UNLIVO gives you the tools, reach and support to achieve more.</p></div><a href="/post-property" className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#13c6a3] px-7 py-4 text-[13px] font-extrabold text-[#06251f]">Get Started <ArrowRight size={17}/></a></div></section><SiteFooter/></main>
}
function Stat({value,label}:{value:string,label:string}){return <div><div className="text-2xl font-extrabold tracking-[-.7px] text-[#102638]">{value}</div><div className="mt-1 text-[11px] text-[#687987]">{label}</div></div>}
function HowStep({number,icon,title,text}:{number:string,icon:React.ReactNode,title:string,text:string}){return <article className="relative rounded-2xl border border-[#e2ebee] bg-[#fbfdfd] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#b9e8df] hover:bg-white hover:shadow-[0_16px_40px_rgba(7,29,45,0.07)]"><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9faf6] text-[#0aa88e]">{icon}</div><span className="text-sm font-extrabold tracking-[1px] text-[#b2c1c8]">{number}</span></div><h3 className="mt-6 text-lg font-extrabold leading-snug text-[#102638]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#657684]">{text}</p></article>}
function PropertyCard({p}:{p:Property}){const meta=[p.bedrooms!=null?`${p.bedrooms} Beds`:null,p.bathrooms!=null?`${p.bathrooms} Baths`:null,p.area_sqft!=null?`${p.area_sqft.toLocaleString("en-IN")} sq ft`:null].filter(Boolean) as string[];return <a href={`/properties/${p.id}`} className="card group block cursor-pointer overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"><div className="relative h-48 bg-[#e9faf6]">{p.cover?<img src={p.cover} alt={p.title} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-[#0bb89b]"><Home size={38}/></div>}<span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#153246]">{p.purpose==="rent"?"For Rent":"For Sale"}</span><span className="absolute right-3 top-3 rounded-full bg-black/25 p-2 text-white backdrop-blur"><Heart size={17}/></span></div><div className="p-4"><h3 className="font-extrabold text-[#102638]">{p.title}</h3><p className="mt-1 text-xs text-[#687987]">{p.locality}, {p.city}</p><p className="mt-3 text-lg font-extrabold text-[#102638]">{price(p)}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#687987]">{meta.map(x=><span key={x}>{x}</span>)}</div></div></a>}
function Benefit({icon,title,text}:{icon:React.ReactNode,title:string,text:string}){return <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0bb89b] shadow-sm">{icon}</div><div><h3 className="font-extrabold text-[#102638]">{title}</h3><p className="mt-1 text-sm text-[#657684]">{text}</p></div></div>}

"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Heart, MapPin, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Property = { id:string; title:string; city:string; locality:string; price:number|null; bedrooms:number|null; bathrooms:number|null; area_sqft:number|null };

export default function PropertiesPage() {
  const [properties,setProperties] = useState<Property[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    async function load() {
      if (!supabase) { setError("Supabase is not configured in this deployment yet."); setLoading(false); return; }
      const result = await supabase.from("properties").select("id,title,city,locality,price,bedrooms,bathrooms,area_sqft").eq("status","published").eq("purpose","sale").order("created_at",{ascending:false});
      if (result.error) setError(result.error.message); else setProperties((result.data || []) as Property[]);
      setLoading(false);
    }
    load();
  }, []);
  return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><header className="border-b bg-white"><div className="container flex h-[78px] items-center justify-between"><a href="/" className="w-[180px] sm:w-[230px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><a href="/" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16}/> Back to home</a></div></header><section className="container py-10"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO Properties</p><h1 className="mt-2 text-3xl font-extrabold">Properties for Sale</h1><p className="mt-2 text-sm text-[#687987]">{loading ? "Searching the UNLIVO marketplace…" : `${properties.length} published properties found`}</p>{error && <div className="mt-8 rounded-xl bg-white p-5 text-sm text-[#8b4b4b]">{error}</div>}{!loading && !error && properties.length === 0 && <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm"><Search className="mx-auto text-[#0bb89b]" size={34}/><h2 className="mt-4 text-xl font-extrabold">No published properties yet</h2><p className="mt-2 text-sm text-[#687987]">Listings published through UNLIVO will appear here automatically.</p></div>}<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{properties.map(p=><article key={p.id} className="rounded-2xl border border-[#e1e9ed] bg-white p-5 shadow-sm"><div className="h-2 rounded-full bg-[#e9faf6]"/><h2 className="mt-5 text-xl font-extrabold">{p.title}</h2><p className="mt-2 flex items-center gap-1 text-sm text-[#687987]"><MapPin size={15}/> {p.locality}, {p.city}</p><p className="mt-5 text-xl font-extrabold">{p.price == null ? "Price on request" : `₹ ${(p.price/10000000).toFixed(2)} Cr`}</p><div className="mt-4 flex gap-4 border-t pt-4 text-xs text-[#687987]">{p.bedrooms != null && <span>{p.bedrooms} Beds</span>}{p.bathrooms != null && <span>{p.bathrooms} Baths</span>}{p.area_sqft != null && <span>{p.area_sqft} sq ft</span>}<Heart size={16} className="ml-auto"/></div></article>)}</div></section></main>;
}

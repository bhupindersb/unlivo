"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Heart, MapPin, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Property = { id:string; title:string; city:string; locality:string; price:number|null; rent_monthly:number|null; bedrooms:number|null; bathrooms:number|null; area_sqft:number|null; category:string; purpose:string };

function PropertiesContent() {
  const searchParams = useSearchParams();
  const [properties,setProperties] = useState<Property[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setError("Supabase is not configured in this deployment yet."); setLoading(false); return; }
      const purposeParam = searchParams.get("purpose");
      const categoryParam = searchParams.get("category");
      const locationParam = searchParams.get("location");
      const budgetParam = searchParams.get("budget");
      const purpose = purposeParam === "rent" ? "rent" : "sale";
      let query = supabase.from("properties").select("id,title,city,locality,price,rent_monthly,bedrooms,bathrooms,area_sqft,category,purpose").eq("status","published").eq("purpose",purpose).order("created_at",{ascending:false});
      if (categoryParam && ["residential","commercial","plot_land","project"].includes(categoryParam)) query = query.eq("category",categoryParam);
      if (locationParam) { const location = locationParam.trim().replace(/,/g, " "); query = query.or(`city.ilike.%${location}%,locality.ilike.%${location}%`); }
      if (budgetParam) { const [min,max] = budgetParam.split("-").map(Number); if (purpose === "sale" && Number.isFinite(min)) query = query.gte("price",min); if (purpose === "sale" && Number.isFinite(max)) query = query.lte("price",max); if (purpose === "rent" && Number.isFinite(min)) query = query.gte("rent_monthly",min); if (purpose === "rent" && Number.isFinite(max)) query = query.lte("rent_monthly",max); }
      const result = await query;
      if (result.error) setError(result.error.message); else setProperties((result.data || []) as Property[]);
      setLoading(false);
    }
    load();
  }, [searchParams]);

  const purpose = searchParams.get("purpose") === "rent" ? "rent" : "sale";
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const heading = purpose === "rent" ? "Properties for Rent" : category === "commercial" ? "Commercial Properties" : category === "plot_land" ? "Plots & Land" : category === "project" ? "Projects" : "Properties for Sale";

  return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><header className="border-b bg-white"><div className="container flex h-[78px] items-center justify-between"><a href="/" className="w-[180px] sm:w-[230px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><a href="/" className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold"><ArrowLeft size={16}/> Back to home</a></div></header><section className="container py-10"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO Properties</p><h1 className="mt-2 text-3xl font-extrabold">{heading}</h1><p className="mt-2 text-sm text-[#687987]">{loading ? "Searching the UNLIVO marketplace…" : `${properties.length} published ${purpose === "rent" ? "rental" : "property"}${properties.length === 1 ? "" : "ies"} found`}{location ? ` in ${location}` : ""}</p>{error && <div className="mt-8 rounded-xl bg-white p-5 text-sm text-[#8b4b4b]">{error}</div>}{!loading && !error && properties.length === 0 && <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm"><Search className="mx-auto text-[#0bb89b]" size={34}/><h2 className="mt-4 text-xl font-extrabold">No matching properties yet</h2><p className="mt-2 text-sm text-[#687987]">Try another location, budget or property type. New UNLIVO listings will appear here automatically.</p></div>}<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{properties.map(p=><a href={`/properties/${p.id}`} key={p.id} className="group block cursor-pointer rounded-2xl border border-[#e1e9ed] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="h-2 rounded-full bg-[#e9faf6] transition group-hover:bg-[#0bb89b]"/><h2 className="mt-5 text-xl font-extrabold">{p.title}</h2><p className="mt-2 flex items-center gap-1 text-sm text-[#687987]"><MapPin size={15}/> {p.locality}, {p.city}</p><p className="mt-5 text-xl font-extrabold">{purpose === "rent" ? (p.rent_monthly == null ? "Rent on request" : `₹ ${p.rent_monthly.toLocaleString("en-IN")}/month`) : (p.price == null ? "Price on request" : `₹ ${(p.price/10000000).toFixed(2)} Cr`)}</p><div className="mt-4 flex gap-4 border-t pt-4 text-xs text-[#687987]">{p.bedrooms != null && <span>{p.bedrooms} Beds</span>}{p.bathrooms != null && <span>{p.bathrooms} Baths</span>}{p.area_sqft != null && <span>{p.area_sqft} sq ft</span>}<Heart size={16} className="ml-auto transition group-hover:scale-110"/></div></a>)}</div></section></main>;
}

export default function PropertiesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7fafb] text-[#102638]"><div className="container py-20 text-center text-sm text-[#687987]">Loading UNLIVO properties…</div></main>}><PropertiesContent /></Suspense>;
}

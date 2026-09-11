"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bath, BedDouble, Car, CheckCircle2, Heart, Home, MapPin, Maximize, MessageCircle, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Property = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  locality: string;
  pincode: string | null;
  address_line: string | null;
  price: number | null;
  rent_monthly: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  plot_area_sqyd: number | null;
  property_type: string | null;
  category: string;
  purpose: string;
  furnishing: string | null;
  possession: string | null;
  parking_spaces: number | null;
  verified: boolean;
  featured: boolean;
};

function formatPrice(property: Property) {
  if (property.purpose === "rent") {
    return property.rent_monthly == null ? "Rent on request" : `₹ ${property.rent_monthly.toLocaleString("en-IN")}/month`;
  }
  if (property.price == null) return "Price on request";
  if (property.price >= 10000000) return `₹ ${(property.price / 10000000).toFixed(2)} Cr`;
  return `₹ ${(property.price / 100000).toFixed(2)} Lakh`;
}

function label(value: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProperty() {
      if (!supabase || !params?.id) {
        setError("This property could not be loaded.");
        setLoading(false);
        return;
      }

      const result = await supabase
        .from("properties")
        .select("id,title,description,city,locality,pincode,address_line,price,rent_monthly,bedrooms,bathrooms,area_sqft,plot_area_sqyd,property_type,category,purpose,furnishing,possession,parking_spaces,verified,featured")
        .eq("id", params.id)
        .eq("status", "published")
        .maybeSingle();

      if (result.error) setError(result.error.message);
      else if (!result.data) setError("This property is no longer available.");
      else setProperty(result.data as Property);
      setLoading(false);
    }

    loadProperty();
  }, [params?.id]);

  if (loading) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><div className="container py-24 text-center text-sm text-[#687987]">Loading property…</div></main>;

  if (error || !property) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><header className="border-b bg-white"><div className="container flex h-[78px] items-center justify-between"><a href="/" className="w-[180px] sm:w-[230px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><a href="/properties" className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold"><ArrowLeft size={16}/> Back to properties</a></div></header><div className="container py-24 text-center"><h1 className="text-2xl font-extrabold">Property unavailable</h1><p className="mt-3 text-sm text-[#687987]">{error || "We could not find this property."}</p><a href="/properties" className="mt-7 inline-flex cursor-pointer rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">Browse properties</a></div></main>;

  const location = [property.locality, property.city, property.pincode].filter(Boolean).join(", ");
  const facts = [
    property.bedrooms != null ? { icon: <BedDouble size={20}/>, value: property.bedrooms, label: "Bedrooms" } : null,
    property.bathrooms != null ? { icon: <Bath size={20}/>, value: property.bathrooms, label: "Bathrooms" } : null,
    property.area_sqft != null ? { icon: <Maximize size={20}/>, value: `${property.area_sqft.toLocaleString("en-IN")} sq ft`, label: "Built-up area" } : null,
    property.parking_spaces != null ? { icon: <Car size={20}/>, value: property.parking_spaces, label: "Parking" } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string | number; label: string }[];

  return <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
    <header className="border-b bg-white"><div className="container flex h-[78px] items-center justify-between"><a href="/" className="w-[180px] sm:w-[230px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><a href="/properties" className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold"><ArrowLeft size={16}/> Back to properties</a></div></header>

    <section className="container py-8 lg:py-10">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="flex min-h-[340px] items-center justify-center rounded-3xl border border-[#dfe9ed] bg-gradient-to-br from-[#e9faf6] via-white to-[#edf4f7] p-10 text-center shadow-sm lg:min-h-[510px]">
          <div><Home size={52} className="mx-auto text-[#0bb89b]"/><p className="mt-5 text-sm font-semibold text-[#547083]">Property photos</p><p className="mt-1 text-xs text-[#7b8c97]">Photos will appear here when uploaded by the listing owner.</p></div>
        </div>
        <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-start justify-between gap-4"><div><span className="inline-flex rounded-full bg-[#e9faf6] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#087f6d]">{label(property.purpose)}</span>{property.featured && <span className="ml-2 inline-flex rounded-full bg-[#eef3f6] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#547083]">Featured</span>}</div><button aria-label="Save property" className="cursor-pointer rounded-full border border-[#dfe9ed] p-3 text-[#547083] transition hover:border-[#0bb89b] hover:text-[#0bb89b]"><Heart size={19}/></button></div>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight lg:text-4xl">{property.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#687987]"><MapPin size={17} className="text-[#0bb89b]"/> {location}</p>
          <p className="mt-7 text-3xl font-extrabold">{formatPrice(property)}</p>
          {property.purpose === "sale" && property.price && property.area_sqft ? <p className="mt-1 text-xs text-[#7b8c97]">₹ {Math.round(property.price / property.area_sqft).toLocaleString("en-IN")} per sq ft</p> : null}
          <div className="mt-7 grid gap-3"><button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#123b53] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#102f44]"><MessageCircle size={18}/> Enquire about this property</button><button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfdde3] bg-white px-5 py-3.5 text-sm font-bold text-[#123b53] transition hover:border-[#0bb89b] hover:text-[#087f6d]"><Heart size={18}/> Save property</button></div>
          {property.verified && <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#f1fbf8] p-4"><ShieldCheck className="shrink-0 text-[#0b8f79]" size={22}/><div><p className="text-sm font-bold">UNLIVO verified listing</p><p className="mt-0.5 text-xs text-[#687987]">This listing has been marked as verified.</p></div></div>}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8">
        <h2 className="text-xl font-extrabold">Property overview</h2>
        {facts.length > 0 && <div className="mt-6 grid grid-cols-2 gap-4 border-b border-[#e8eef1] pb-7 md:grid-cols-4">{facts.map((fact) => <div key={fact.label} className="rounded-2xl bg-[#f7fafb] p-4"><div className="text-[#0bb89b]">{fact.icon}</div><p className="mt-3 text-sm font-extrabold">{fact.value}</p><p className="mt-1 text-xs text-[#687987]">{fact.label}</p></div>)}</div>}
        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <div><h3 className="text-sm font-extrabold uppercase tracking-[1.5px] text-[#547083]">Details</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-5"><dt className="text-[#687987]">Property type</dt><dd className="font-semibold text-right">{label(property.property_type)}</dd></div><div className="flex justify-between gap-5"><dt className="text-[#687987]">Category</dt><dd className="font-semibold text-right">{label(property.category)}</dd></div><div className="flex justify-between gap-5"><dt className="text-[#687987]">Possession</dt><dd className="font-semibold text-right">{label(property.possession)}</dd></div><div className="flex justify-between gap-5"><dt className="text-[#687987]">Furnishing</dt><dd className="font-semibold text-right">{label(property.furnishing)}</dd></div>{property.plot_area_sqyd != null && <div className="flex justify-between gap-5"><dt className="text-[#687987]">Plot area</dt><dd className="font-semibold text-right">{property.plot_area_sqyd.toLocaleString("en-IN")} sq yd</dd></div>}</dl></div>
          <div><h3 className="text-sm font-extrabold uppercase tracking-[1.5px] text-[#547083]">Location</h3><p className="mt-4 text-sm leading-6 text-[#687987]">{property.address_line ? `${property.address_line}, ` : ""}{location}</p><div className="mt-4 flex items-center gap-2 text-sm font-semibold"><MapPin size={17} className="text-[#0bb89b]"/> {property.locality}, {property.city}</div></div>
        </div>
        {property.description && <div className="mt-8 border-t border-[#e8eef1] pt-8"><h3 className="text-xl font-extrabold">About this property</h3><p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-7 text-[#687987]">{property.description}</p></div>}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#dfe9ed] bg-white p-5 text-sm text-[#687987] shadow-sm"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#0bb89b]"/><p><span className="font-bold text-[#102638]">Shop with confidence.</span> UNLIVO is building a transparent property marketplace where listings, enquiries and verification can be managed in one place.</p></div>
    </section>
  </main>;
}

"use client";

import { useState } from "react";
import { Building2, ChevronDown, Home, KeyRound, LandPlot, Search } from "lucide-react";

const tabs = [
  { label: "Buy", value: "sale", icon: Home },
  { label: "Rent", value: "rent", icon: KeyRound },
  { label: "Commercial", value: "commercial", icon: Building2 },
  { label: "Plots & Land", value: "plot_land", icon: LandPlot },
  { label: "Projects", value: "project", icon: Building2 },
];

export default function PropertySearch() {
  const [purpose, setPurpose] = useState("sale");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState("all");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("purpose", purpose);
    if (location.trim()) params.set("location", location.trim());
    if (category !== "all") params.set("category", category);
    if (budget !== "all") params.set("budget", budget);
    window.location.href = `/properties?${params.toString()}`;
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/70 bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[#edf1f3] pb-3 text-[13px] font-bold">
        {tabs.map(({ label, value, icon: Icon }) => (
          <button type="button" key={value} onClick={() => setPurpose(value)} className={`flex items-center gap-2 border-b-2 pb-2 transition ${purpose === value ? "border-[#102638] text-[#102638]" : "border-transparent text-[#5d6d7c]"}`}>
            <Icon size={20} />{label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1.5fr_.62fr_.62fr_auto]">
        <div className="flex min-h-[48px] items-center gap-3 rounded-lg bg-[#f5f8fa] px-4 py-3 text-[13px] text-[#7b8994]">
          <Search size={20} className="shrink-0" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-transparent outline-none placeholder:text-[#7b8994]" placeholder="Search by city, area, project or keyword" />
        </div>
        <label className="relative flex min-h-[48px] items-center rounded-lg border border-[#dce5ea] bg-white px-4 text-[13px] text-[#193246]">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none bg-transparent outline-none">
            <option value="all">Property Type</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="plot_land">Plots & Land</option><option value="project">Projects</option>
          </select><ChevronDown size={17} className="pointer-events-none absolute right-4 text-[#71818d]" />
        </label>
        <label className="relative flex min-h-[48px] items-center rounded-lg border border-[#dce5ea] bg-white px-4 text-[13px] text-[#193246]">
          <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full appearance-none bg-transparent outline-none">
            <option value="all">Budget</option><option value="0-5000000">Under ₹50 Lakh</option><option value="5000000-10000000">₹50 Lakh – ₹1 Cr</option><option value="10000000-25000000">₹1 – ₹2.5 Cr</option><option value="25000000-9999999999">₹2.5 Cr+</option>
          </select><ChevronDown size={17} className="pointer-events-none absolute right-4 text-[#71818d]" />
        </label>
        <button type="submit" className="min-h-[48px] rounded-lg bg-[#071d2d] px-8 py-3 text-[13px] font-bold text-white transition hover:bg-[#102f44]">Search</button>
      </div>
    </form>
  );
}

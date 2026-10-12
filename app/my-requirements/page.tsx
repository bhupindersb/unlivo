"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  XCircle,
  Bell,
  BellRing,
} from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Requirement = {
  id: string; purpose: string; category: string; property_types: string[];
  preferred_cities: string[]; preferred_localities: string[]; min_price: number | null;
  max_price: number | null; min_bedrooms: number | null; max_bedrooms: number | null;
  min_area_sqft: number | null; max_area_sqft: number | null;
  possession_preferences: string[]; furnishing_preferences: string[];
  notes: string | null; status: string; created_at: string;
};
type Reason = { label: string; detail: string; ok: boolean; neutral?: boolean };
type MatchNotification = { id:string; property_id:string; requirement_id:string; match_score:number; email_sent:boolean; push_sent:boolean; created_at:string; read_at:string|null; property?: { title:string; city:string; locality:string; price:number|null; rent_monthly:number|null; purpose:string } | null };
type Property = {
  id: string; title: string; city: string; locality: string; price: number | null;
  rent_monthly: number | null; purpose: string; category: string; property_type: string | null;
  bedrooms: number | null; area_sqft: number | null; possession: string | null;
  furnishing: string | null; status: string; match_score: number; match_reasons: Reason[];
};

const sentence = (v: string) => v.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
function money(p: Property) {
  if (p.purpose === "rent") return p.rent_monthly == null ? "Rent on request" : `₹ ${p.rent_monthly.toLocaleString("en-IN")}/mo`;
  if (p.price == null) return "Price on request";
  return p.price >= 10000000 ? `₹ ${(p.price / 10000000).toFixed(2)} Cr` : `₹ ${(p.price / 100000).toFixed(2)} Lakh`;
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 90 ? "Excellent match" : score >= 75 ? "Strong match" : score >= 60 ? "Good match" : "Partial match";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 rounded-full bg-[#e7f7f3]">
        <div className="absolute inset-[4px] flex items-center justify-center rounded-full bg-white">
          <span className="text-sm font-extrabold text-[#087f73]">{score}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-extrabold text-[#123b53]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[#71838d]">Based on your requirement</p>
      </div>
    </div>
  );
}

export default function MyRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState("match");
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { window.location.href = "/login"; return; }
      const r = await supabase.from("buyer_requirements")
        .select("id,purpose,category,property_types,preferred_cities,preferred_localities,min_price,max_price,min_bedrooms,max_bedrooms,min_area_sqft,max_area_sqft,possession_preferences,furnishing_preferences,notes,status,created_at")
        .eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (r.error) { setError(r.error.message); setLoading(false); return; }
      const rows = (r.data || []) as Requirement[];
      setRequirements(rows);
      if (rows.length) setSelected(rows[0].id);
      setLoading(false);
    })();
  }, []);

  const requirement = requirements.find(r => r.id === selected) || requirements[0];

  const loadNotifications = async () => {
    if (!supabase) return;
    const r = await supabase.from("buyer_requirement_match_notifications").select("id,property_id,requirement_id,match_score,email_sent,push_sent,created_at,read_at,property:properties(title,city,locality,price,rent_monthly,purpose)").order("created_at",{ascending:false}).limit(20);
    if (!r.error) { const rows = (r.data || []).map((row: any) => ({ ...row, property: Array.isArray(row.property) ? (row.property[0] ?? null) : (row.property ?? null) })) as MatchNotification[]; setNotifications(rows); }
  };
  useEffect(() => { loadNotifications(); }, []);
  const unreadCount = notifications.filter(n => !n.read_at).length;
  const markNotificationRead = async (id:string) => { if (!supabase) return; const now=new Date().toISOString(); await supabase.from("buyer_requirement_match_notifications").update({read_at:now}).eq("id",id); setNotifications(prev=>prev.map(n=>n.id===id?{...n,read_at:now}:n)); };

  useEffect(() => {
    (async () => {
      if (!supabase || !requirement) return;
      setMatchingLoading(true); setError("");
      const r = await supabase.rpc("get_buyer_requirement_matches", {
        p_requirement_id: requirement.id, p_limit: 24,
      });
      if (r.error) { setError(r.error.message); setProperties([]); }
      else setProperties((r.data || []) as Property[]);
      setMatchingLoading(false);
    })();
  }, [requirement?.id]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = properties.filter(p =>
      p.match_score >= minMatch &&
      (!q || [p.title, p.city, p.locality, p.property_type].filter(Boolean).join(" ").toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      if (sortBy === "price") return (a.price ?? a.rent_monthly ?? Number.MAX_SAFE_INTEGER) - (b.price ?? b.rent_monthly ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === "newest") return b.id.localeCompare(a.id);
      return b.match_score - a.match_score;
    }).slice(0, 12);
  }, [properties, search, minMatch, sortBy]);

  const stats = useMemo(() => ({
    excellent: properties.filter(p => p.match_score >= 90).length,
    strong: properties.filter(p => p.match_score >= 75).length,
    shown: matches.length,
  }), [properties, matches]);

  if (loading) return <><SiteHeader /><main className="flex min-h-[65vh] items-center justify-center bg-[#f5f8fa] text-sm text-[#687987]">Loading your requirements…</main><SiteFooter /></>;

  return <>
    <SiteHeader />
    <main className="min-h-[65vh] bg-[#f5f8fa] text-[#102638]">
      <div className="mx-auto max-w-[1280px] px-5 py-8 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">Buyer Dashboard</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-[-1.5px]">My Requirements</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">Tell UNLIVO what you are looking for. We rank published properties against your requirements and explain why each property matches.</p>
          </div>
          <a href="/post-requirement" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071d2d] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#102f44]"><Plus size={17} /> Post Requirement</a>
          <button type="button" onClick={()=>setShowNotifications(v=>!v)} className="relative inline-flex items-center justify-center rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-[#123b53] shadow-sm"><Bell size={18}/><span className="ml-2 text-sm font-bold">Matches</span>{unreadCount>0&&<span className="ml-2 min-w-5 rounded-full bg-[#0bb89b] px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white">{unreadCount}</span>}</button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
        {showNotifications && <div className="mt-5 rounded-3xl border border-[#dfe9ed] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e6edef] px-5 py-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#087f73]">Match inbox</p><h2 className="mt-1 text-xl font-extrabold">New property matches</h2></div><button type="button" onClick={()=>setShowNotifications(false)}><X size={18}/></button></div>{notifications.length===0?<div className="p-8 text-center text-sm text-[#687987]">No property match notifications yet.</div>:<div className="divide-y divide-[#edf1f3]">{notifications.map(n=><div key={n.id} className={n.read_at?"bg-white p-5":"bg-[#f4fbf9] p-5"}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff7f0] text-[#087f73]">{n.read_at?<Bell size={16}/>:<BellRing size={16}/>}</div><div><p className="text-sm font-extrabold text-[#123b53]">{n.property?.title||"New matching property"}</p><p className="mt-1 text-xs text-[#687987]">{[n.property?.locality,n.property?.city].filter(Boolean).join(", ")||"Property"} · <span className="font-bold text-[#087f73]">{n.match_score}% match</span></p><p className="mt-1 text-[11px] text-[#8a9aa3]">{new Date(n.created_at).toLocaleString("en-IN")}</p></div></div><div className="flex gap-2 sm:shrink-0">{!n.read_at&&<button type="button" onClick={()=>markNotificationRead(n.id)} className="rounded-xl border border-[#cbdde3] bg-white px-3 py-2 text-xs font-bold text-[#315b6e]">Mark read</button>}<a href={`/properties/${n.property_id}`} onClick={()=>markNotificationRead(n.id)} className="rounded-xl bg-[#071d2d] px-3.5 py-2 text-xs font-extrabold text-white">View property</a></div></div></div>)}</div>}</div>}

        {requirements.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-[#dfe9ed] bg-white p-12 text-center shadow-sm">
            <SlidersHorizontal className="mx-auto text-[#0bb89b]" size={38} />
            <h2 className="mt-4 text-2xl font-extrabold">Tell UNLIVO what you want</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#687987]">Post your budget, locations and property preferences and we’ll turn them into a matching profile.</p>
            <a href="/post-requirement" className="mt-6 inline-flex rounded-xl bg-[#0bb89b] px-6 py-3 text-sm font-extrabold text-white">Post Your First Requirement</a>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-[1.5px] text-[#547083]">Your requirements</p>
                <span className="rounded-full bg-[#e7f7f3] px-2.5 py-1 text-[10px] font-extrabold text-[#087f73]">{requirements.length}</span>
              </div>
              {requirements.map(r => (
                <button key={r.id} onClick={() => { setSelected(r.id); setExpanded(null); setMinMatch(0); setSearch(""); }}
                  className={`w-full rounded-2xl border p-5 text-left transition ${selected === r.id ? "border-[#0bb89b] bg-white shadow-sm" : "border-[#dfe9ed] bg-white/70 hover:bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#e9faf4] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#087f73]">{sentence(r.status)}</span>
                    <span className="text-xs text-[#8a9aa3]">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                  <h2 className="mt-4 font-extrabold">{r.purpose === "sale" ? "Buy" : "Rent"} · {sentence(r.category)}</h2>
                  <p className="mt-2 text-sm text-[#687987]">{r.preferred_cities.join(", ") || "Any city"}</p>
                  <p className="mt-1 text-xs text-[#81919a]">{r.property_types.map(sentence).join(", ") || "Any property type"}</p>
                </button>
              ))}
            </aside>

            <section>
              <div className="rounded-3xl border border-[#dfe9ed] bg-white shadow-sm">
                <div className="p-5 lg:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f7f3] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#087f73]"><Sparkles size={12} /> Smart matching</span>
                        <span className="text-xs text-[#81919a]">{properties.length} properties evaluated</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-extrabold">{requirement.purpose === "sale" ? "Buy" : "Rent"} in {requirement.preferred_cities.join(", ") || "your preferred locations"}</h2>
                      <p className="mt-2 text-sm text-[#687987]">{requirement.property_types.map(sentence).join(", ") || "Any property type"} {requirement.min_bedrooms || requirement.max_bedrooms ? `· ${requirement.min_bedrooms || "Any"}–${requirement.max_bedrooms || "Any"} bedrooms` : ""}</p>
                    </div>
                    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e2ecef] bg-[#f8fbfc]">
                      <div className="px-4 py-3 text-center"><p className="text-lg font-extrabold text-[#123b53]">{stats.shown}</p><p className="text-[10px] font-bold uppercase tracking-wide text-[#81919a]">Shown</p></div>
                      <div className="border-x border-[#e2ecef] px-4 py-3 text-center"><p className="text-lg font-extrabold text-[#087f73]">{stats.strong}</p><p className="text-[10px] font-bold uppercase tracking-wide text-[#81919a]">75%+</p></div>
                      <div className="px-4 py-3 text-center"><p className="text-lg font-extrabold text-[#087f73]">{stats.excellent}</p><p className="text-[10px] font-bold uppercase tracking-wide text-[#81919a]">90%+</p></div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-[#edf2f4] pt-5 md:flex-row">
                    <div className="relative flex-1">
                      <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81929b]" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by property, city or locality…" className="w-full rounded-xl border border-[#d7e3e8] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0bb89b]" />
                    </div>
                    <label className="relative">
                      <Target size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71838d]" />
                      <select value={minMatch} onChange={e => setMinMatch(Number(e.target.value))} className="w-full appearance-none rounded-xl border border-[#d7e3e8] bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-[#345366] outline-none focus:border-[#0bb89b]">
                        <option value={0}>All match scores</option><option value={60}>60%+ matches</option><option value={75}>75%+ matches</option><option value={90}>90%+ matches</option>
                      </select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#71838d]" />
                    </label>
                    <label className="relative">
                      <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full appearance-none rounded-xl border border-[#d7e3e8] bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-[#345366] outline-none focus:border-[#0bb89b]">
                        <option value="match">Best match first</option><option value="price">Lowest price first</option><option value="newest">Newest first</option>
                      </select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#71838d]" />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {requirement.preferred_localities.map(x => <span key={x} className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-xs font-bold text-[#60737e]">{x}</span>)}
                    {requirement.max_price && <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-xs font-bold text-[#60737e]">Up to ₹{Number(requirement.max_price).toLocaleString("en-IN")}</span>}
                    {requirement.max_area_sqft && <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-xs font-bold text-[#60737e]">Up to {Number(requirement.max_area_sqft).toLocaleString("en-IN")} sq ft</span>}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {matchingLoading ? (
                  <div className="rounded-3xl border border-[#dfe9ed] bg-white p-12 text-center"><Sparkles className="mx-auto animate-pulse text-[#0bb89b]" size={28} /><p className="mt-3 text-sm font-semibold text-[#687987]">Finding the best matches…</p></div>
                ) : matches.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#cbdde3] bg-white p-12 text-center">
                    <Target className="mx-auto text-[#0bb89b]" size={32} /><h3 className="mt-4 text-lg font-extrabold">No properties meet this filter</h3>
                    <p className="mt-2 text-sm text-[#687987]">{properties.length ? "Try a lower match threshold or a broader search." : `We’ll show published ${sentence(requirement.category).toLowerCase()} properties here as suitable inventory becomes available.`}</p>
                    {minMatch > 0 && <button onClick={() => setMinMatch(0)} className="mt-5 rounded-xl bg-[#071d2d] px-5 py-2.5 text-sm font-bold text-white">Show all matches</button>}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {matches.map(p => {
                      const open = expanded === p.id;
                      const positive = p.match_reasons.filter(x => x.ok && !x.neutral);
                      const neutral = p.match_reasons.filter(x => x.neutral);
                      const negative = p.match_reasons.filter(x => !x.ok);
                      return (
                        <article key={p.id} className="group overflow-hidden rounded-2xl border border-[#dfe9ed] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                          <div className="border-b border-[#e8eff1] bg-[#f8fbfc] p-4"><ScoreBadge score={p.match_score} /></div>
                          <div className="p-5">
                            <h3 className="line-clamp-2 text-lg font-extrabold">{p.title}</h3>
                            <p className="mt-2 flex items-start gap-1 text-sm text-[#687987]"><MapPin size={15} className="mt-0.5 shrink-0 text-[#0bb89b]" />{p.locality}, {p.city}</p>
                            <p className="mt-4 text-lg font-extrabold text-[#123b53]">{money(p)}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#60737e]">
                              {p.property_type && <span className="rounded-full bg-[#f1f5f7] px-2.5 py-1">{p.property_type}</span>}
                              {p.bedrooms != null && <span className="rounded-full bg-[#f1f5f7] px-2.5 py-1">{p.bedrooms} bed</span>}
                              {p.area_sqft != null && <span className="rounded-full bg-[#f1f5f7] px-2.5 py-1">{p.area_sqft.toLocaleString("en-IN")} sq ft</span>}
                            </div>
                            <button type="button" onClick={() => setExpanded(open ? null : p.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] transition hover:border-[#0bb89b] hover:text-[#087f73]">{open ? "Hide match details" : "Why this matches"} {open ? <X size={15} /> : <ArrowRight size={15} />}</button>
                            {open && <div className="mt-4 rounded-2xl border border-[#e3ecef] bg-[#f8fbfc] p-4">
                              <p className="text-[11px] font-extrabold uppercase tracking-[1.4px] text-[#547083]">Match breakdown</p>
                              <div className="mt-3 space-y-2.5">
                                {positive.map(x => <div key={x.label} className="flex gap-2 text-xs"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0b8f79]" /><div><span className="font-extrabold text-[#123b53]">{x.label}: </span><span className="text-[#60737e]">{x.detail}</span></div></div>)}
                                {neutral.map(x => <div key={x.label} className="flex gap-2 text-xs"><div className="mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border border-[#9aabb4]" /><div><span className="font-extrabold text-[#123b53]">{x.label}: </span><span className="text-[#60737e]">{x.detail}</span></div></div>)}
                                {negative.map(x => <div key={x.label} className="flex gap-2 text-xs"><XCircle size={15} className="mt-0.5 shrink-0 text-[#b86b6b]" /><div><span className="font-extrabold text-[#123b53]">{x.label}: </span><span className="text-[#8b6666]">{x.detail}</span></div></div>)}
                              </div>
                            </div>}
                            <a href={`/properties/${p.id}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#071d2d] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#102f44]">View Property <ArrowRight size={15} /></a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
    <SiteFooter />
  </>;
}
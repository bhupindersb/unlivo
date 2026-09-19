"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Home, MessageCircle, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Visit = {
  id: string;
  property_id: string;
  enquiry_id: string | null;
  requester_id: string;
  owner_id: string;
  requested_for: string;
  proposed_for: string | null;
  status: string;
  requester_note: string | null;
  owner_note: string | null;
  created_at: string;
  updated_at: string;
};

type Property = { id: string; title: string; city: string; locality: string; price: number | null; rent_monthly: number | null; purpose: string; };

type Profile = { id: string; full_name: string | null; };

const statusLabel = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPrice(p: Property) {
  if (p.purpose === "rent") return p.rent_monthly ? `₹ ${p.rent_monthly.toLocaleString("en-IN")}/month` : "Rent on request";
  return p.price ? `₹ ${p.price >= 10000000 ? (p.price / 10000000).toFixed(2) + " Cr" : (p.price / 100000).toFixed(2) + " Lakh"}` : "Price on request";
}

export default function VisitsPage() {
  const [userId, setUserId] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [highlightedVisit, setHighlightedVisit] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [proposedDates, setProposedDates] = useState<Record<string, string>>({});
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({});

  const load = async () => {
    if (!supabase) return;
    const u = await supabase.auth.getUser();
    if (!u.data.user) {
      window.location.href = "/login?next=/visits";
      return;
    }
    const uid = u.data.user.id;
    setUserId(uid);

    const v = await supabase
      .from("site_visits")
      .select("id,property_id,enquiry_id,requester_id,owner_id,requested_for,proposed_for,status,requester_note,owner_note,created_at,updated_at")
      .or(`requester_id.eq.${uid},owner_id.eq.${uid}`)
      .order("updated_at", { ascending: false });

    if (v.error) {
      setError(v.error.message);
      setLoading(false);
      return;
    }

    const rows = (v.data || []) as Visit[];
    setVisits(rows);

    const propertyIds = Array.from(new Set(rows.map(x => x.property_id)));
    const profileIds = Array.from(new Set(rows.flatMap(x => [x.requester_id, x.owner_id])));
    const [p, pr] = await Promise.all([
      propertyIds.length
        ? supabase.from("properties").select("id,title,city,locality,price,rent_monthly,purpose").in("id", propertyIds)
        : Promise.resolve({ data: [] as Property[] }),
      profileIds.length
        ? supabase.from("profiles").select("id,full_name").in("id", profileIds)
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

    setProperties((p.data || []) as Property[]);
    setProfiles((pr.data || []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const visitId = new URLSearchParams(window.location.search).get("visit") || "";
    if (visitId && visits.some(v => v.id === visitId)) {
      setHighlightedVisit(visitId);
      window.setTimeout(() => document.querySelector(`[data-visit-id="${visitId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [visits]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase
      .channel(`site-visits-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visits" }, () => { void load(); })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [userId]);

  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);

  const updateVisit = async (visit: Visit, patch: Partial<Visit>) => {
    if (!supabase) return;
    setBusy(visit.id);
    setError("");
    const r = await supabase.from("site_visits").update(patch).eq("id", visit.id);
    if (r.error) setError(r.error.message);
    else { await load(); void supabase.functions.invoke("notify-enquiry", { body: { event: "site_visit_update", visit_id: visit.id } }); }
    setBusy("");
  };

  const propose = async (visit: Visit) => {
    const date = proposedDates[visit.id];
    const time = proposedTimes[visit.id] || "09:00";
    if (!date) {
      setError("Choose a proposed date before sending a new time.");
      return;
    }
    await updateVisit(visit, {
      status: "proposed",
      proposed_for: new Date(`${date}T${time}:00`).toISOString(),
      owner_note: notes[visit.id]?.trim() || null,
    });
  };

  if (loading) return <main className="min-h-screen bg-[#f7fafb]"><SiteHeader/><div className="container py-24 text-center text-sm text-[#687987]">Loading site visits…</div><SiteFooter/></main>;

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader/>
      <section className="container max-w-6xl py-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO property visits</p>
            <h1 className="mt-2 text-4xl font-extrabold">My Site Visits</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">Manage your requested and confirmed property visits in one place.</p>
          </div>
          <a href="/my-properties" className="rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-sm font-bold text-[#123b53]">My Properties</a>
        </div>

        {error && <div className="mt-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}

        <div className="mt-8 space-y-5">
          {visits.length === 0 ? (
            <div className="rounded-3xl border border-[#dfe9ed] bg-white p-12 text-center shadow-sm">
              <CalendarDays className="mx-auto text-[#0bb89b]" size={42}/>
              <h2 className="mt-4 text-xl font-extrabold">No site visits yet</h2>
              <p className="mt-2 text-sm text-[#687987]">When you request a visit, it will appear here.</p>
            </div>
          ) : visits.map(visit => {
            const property = propertyMap.get(visit.property_id);
            const owner = visit.owner_id === userId;
            const other = owner ? profileMap.get(visit.requester_id)?.full_name || "Buyer" : profileMap.get(visit.owner_id)?.full_name || "Property owner";
            const active = ["requested","proposed","confirmed"].includes(visit.status);
            return (
              <article key={visit.id} data-visit-id={visit.id} className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${highlightedVisit === visit.id ? "border-[#0bb89b] ring-2 ring-[#0bb89b]/20" : "border-[#dfe9ed]"}`} >
                <div className="border-b border-[#e8eef1] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1px] ${owner ? "bg-[#e9faf6] text-[#087f73]" : "bg-[#eef5ff] text-[#315b91]"}`}>{owner ? "Received" : "Requested"}</span>
                        <span className="rounded-full bg-[#f1f5f7] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">{statusLabel(visit.status)}</span>
                      </div>
                      <h2 className="mt-3 text-xl font-extrabold">{property?.title || "Property visit"}</h2>
                      <p className="mt-1 text-sm text-[#687987]">{[property?.locality, property?.city].filter(Boolean).join(", ")} · {property ? formatPrice(property) : ""}</p>
                    </div>
                    <a href={`/properties/${visit.property_id}`} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"><Home size={16}/> View property</a>
                  </div>
                </div>

                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">{owner ? "Visitor" : "Property owner"}</p><p className="mt-1 font-extrabold">{other}</p></div>
                    <div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Requested time</p><p className="mt-1 font-extrabold">{formatDate(visit.requested_for)}</p></div>
                    {visit.proposed_for && <div className="rounded-2xl bg-[#fffaf0] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#8a691f]">Proposed new time</p><p className="mt-1 font-extrabold text-[#5f563f]">{formatDate(visit.proposed_for)}</p></div>}
                    {visit.requester_note && <div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Buyer note</p><p className="mt-1 leading-6">{visit.requester_note}</p></div>}
                    {visit.owner_note && <div className="rounded-2xl bg-[#f7fafb] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Owner note</p><p className="mt-1 leading-6">{visit.owner_note}</p></div>}
                  </div>

                  <div>
                    {owner && active && (
                      <div className="rounded-2xl border border-[#dfe9ed] p-5">
                        <p className="text-sm font-extrabold">Respond to this request</p>
                        <textarea rows={3} value={notes[visit.id] || ""} onChange={e => setNotes(v => ({...v,[visit.id]:e.target.value}))} placeholder="Optional note to the buyer…" className="mt-3 w-full resize-none rounded-xl border border-[#d7e3e8] px-4 py-3 text-sm outline-none focus:border-[#0bb89b]"/>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button disabled={busy===visit.id} onClick={() => void updateVisit(visit,{status:"confirmed",owner_note:notes[visit.id]?.trim()||null,proposed_for:null})} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Confirm</button>
                          <button disabled={busy===visit.id} onClick={() => void updateVisit(visit,{status:"declined",owner_note:notes[visit.id]?.trim()||null})} className="inline-flex items-center gap-2 rounded-xl border border-[#efcccc] bg-[#fff7f7] px-4 py-2.5 text-sm font-bold text-[#8b4b4b] disabled:opacity-50"><X size={16}/> Decline</button>
                        </div>
                        <div className="mt-5 border-t border-[#e8eef1] pt-5">
                          <p className="text-sm font-extrabold">Propose another time</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <input type="date" min={new Date().toISOString().slice(0,10)} value={proposedDates[visit.id] || ""} onChange={e => setProposedDates(v => ({...v,[visit.id]:e.target.value}))} className="rounded-xl border border-[#d7e3e8] px-3 py-2.5 text-sm"/>
                            <select value={proposedTimes[visit.id] || "09:00"} onChange={e => setProposedTimes(v => ({...v,[visit.id]:e.target.value}))} className="rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm">
                              <option value="09:00">9:00 AM</option><option value="11:00">11:00 AM</option><option value="14:00">2:00 PM</option><option value="16:00">4:00 PM</option><option value="18:00">6:00 PM</option>
                            </select>
                          </div>
                          <button disabled={busy===visit.id} onClick={() => void propose(visit)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><Clock3 size={16}/> Propose new time</button>
                        </div>
                      </div>
                    )}

                    {!owner && visit.status === "proposed" && visit.proposed_for && (
                      <div className="rounded-2xl border border-[#dfe9ed] p-5">
                        <p className="text-sm font-extrabold">The owner proposed a new time</p>
                        <p className="mt-2 text-sm text-[#687987]">{formatDate(visit.proposed_for)}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button disabled={busy===visit.id} onClick={() => void updateVisit(visit,{status:"confirmed",requested_for:visit.proposed_for,proposed_for:null})} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Accept new time</button>
                          <button disabled={busy===visit.id} onClick={() => void updateVisit(visit,{status:"cancelled"})} className="inline-flex items-center gap-2 rounded-xl border border-[#efcccc] bg-[#fff7f7] px-4 py-2.5 text-sm font-bold text-[#8b4b4b] disabled:opacity-50"><X size={16}/> Cancel request</button>
                        </div>
                      </div>
                    )}

                    {!owner && ["requested","confirmed"].includes(visit.status) && (
                      <button disabled={busy===visit.id} onClick={() => void updateVisit(visit,{status:"cancelled"})} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#60737e] disabled:opacity-50"><X size={16}/> Cancel visit request</button>
                    )}

                    {visit.status === "confirmed" && (
                      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[#e9faf6] p-4 text-sm text-[#087f73]"><Check size={19} className="mt-0.5 shrink-0"/><p><span className="font-extrabold">Visit confirmed.</span> Please coordinate any final access details through the enquiry conversation.</p></div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <SiteFooter/>
    </main>
  );
}

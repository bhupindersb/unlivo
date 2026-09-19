"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, Home, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Visit = {
  id: string;
  property_id: string;
  requester_id: string;
  owner_id: string;
  requested_for: string;
  proposed_for: string | null;
  status: string;
  requester_note: string | null;
  owner_note: string | null;
};

type Property = { id: string; title: string; city: string | null; state: string | null };
type Profile = { id: string; full_name: string | null };

export default function VisitsPage() {
  const [userId, setUserId] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [highlightedVisit, setHighlightedVisit] = useState("");
  const [proposalDate, setProposalDate] = useState<Record<string, string>>({});
  const [proposalTime, setProposalTime] = useState<Record<string, string>>({});

  async function loadVisits() {
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Please sign in to view your site visits.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("site_visits")
      .select("id, property_id, requester_id, owner_id, requested_for, proposed_for, status, requester_note, owner_note")
      .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order("requested_for", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Visit[];
    const propertyIds = Array.from(new Set(rows.map((row) => row.property_id)));
    const profileIds = Array.from(new Set(rows.flatMap((row) => [row.requester_id, row.owner_id])));

    let propertyRows: Property[] = [];
    let profileRows: Profile[] = [];

    if (propertyIds.length) {
      const result = await supabase.from("properties").select("id, title, city, state").in("id", propertyIds);
      if (result.data) propertyRows = result.data as Property[];
    }

    if (profileIds.length) {
      const result = await supabase.from("profiles").select("id, full_name").in("id", profileIds);
      if (result.data) profileRows = result.data as Profile[];
    }

    setVisits(rows);
    setProperties(propertyRows);
    setProfiles(profileRows);
    setLoading(false);
  }

  useEffect(() => {
    void loadVisits();

    const channel = supabase
      .channel("site-visits-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_visits" },
        () => {
          void loadVisits();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const visitId = new URLSearchParams(window.location.search).get("visit") || "";
    if (!visitId || !visits.some((visit) => visit.id === visitId)) return;
    setHighlightedVisit(visitId);
    window.setTimeout(() => {
      const element = document.getElementById("visit-" + visitId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [visits]);

  async function updateVisit(id: string, status: string, proposedFor?: string | null) {
    setBusyId(id);
    setMessage("");

    const values: { status: string; proposed_for?: string | null } = { status };
    if (proposedFor !== undefined) values.proposed_for = proposedFor;

    const { error } = await supabase.from("site_visits").update(values).eq("id", id);

    if (error) {
      setMessage(error.message);
      setBusyId("");
      return;
    }

    await loadVisits();

    void supabase.functions.invoke("notify-enquiry", {
      body: { event: "site_visit_update", visit_id: id },
    });

    setBusyId("");
  }

  function propertyFor(id: string) {
    return properties.find((property) => property.id === id);
  }

  function profileFor(id: string) {
    return profiles.find((profile) => profile.id === id);
  }

  function formatDate(value: string | null) {
    if (!value) return "Not proposed yet";
    return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-6xl py-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO property visits</p>
            <h1 className="mt-2 text-4xl font-extrabold">My Site Visits</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">Manage your requested and confirmed property visits in one place.</p>
          </div>
          <a href="/my-properties" className="rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-sm font-bold text-[#123b53]">My Properties</a>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm"><p className="text-sm font-bold text-[#687987]">Loading your site visits...</p></div>
        ) : message && visits.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#efcccc] bg-white p-10 text-center shadow-sm"><p className="text-sm font-bold text-[#8b4b4b]">{message}</p></div>
        ) : visits.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm">
            <CalendarDays className="mx-auto text-[#0bb89b]" size={38} />
            <h2 className="mt-4 text-xl font-extrabold">No site visits yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">When you request a property visit, it will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {message ? <div className="rounded-xl border border-[#efcccc] bg-white px-4 py-3 text-sm font-bold text-[#8b4b4b]">{message}</div> : null}
            {visits.map((visit) => {
              const property = propertyFor(visit.property_id);
              const requester = profileFor(visit.requester_id);
              const owner = profileFor(visit.owner_id);
              const isOwner = userId === visit.owner_id;
              const isRequester = userId === visit.requester_id;
              const busy = busyId === visit.id;
              const canOwnerAct = isOwner && (visit.status === "requested" || visit.status === "proposed");
              const canBuyerAct = isRequester && visit.status === "proposed";
              const canCancel = (isRequester || isOwner) && ["requested", "proposed", "confirmed"].includes(visit.status);
              const statusStyles: Record<string, string> = {
                requested: "border-[#f3d49b] bg-[#fff8e8] text-[#9a6500]",
                proposed: "border-[#b9d8f3] bg-[#eef7ff] text-[#28608f]",
                confirmed: "border-[#a9dfc7] bg-[#eafaf2] text-[#137a4f]",
                declined: "border-[#efcccc] bg-[#fff2f2] text-[#a24646]",
                cancelled: "border-[#d7e0e5] bg-[#f2f5f7] text-[#60737e]",
                completed: "border-[#b9d8f3] bg-[#eef7ff] text-[#28608f]",
              };

              return (
                <article id={"visit-" + visit.id} key={visit.id} className={"overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow " + (highlightedVisit === visit.id ? "border-[#0bb89b] ring-2 ring-[#0bb89b]/20" : "border-[#dfe9ed]")}>
                  <div className="border-b border-[#e8eef1] p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={"inline-flex items-center rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[1.2px] shadow-sm " + (statusStyles[visit.status] || "border-[#d7e0e5] bg-[#f2f5f7] text-[#60737e]")}>
                            {visit.status}
                          </span>
                          <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">{isOwner ? "Owner" : "Buyer"}</span>
                        </div>
                        <h2 className="mt-3 text-xl font-extrabold">{property?.title || "Property"}</h2>
                        <p className="mt-1 text-sm text-[#687987]">{[property?.city, property?.state].filter(Boolean).join(", ") || "Property location"}</p>
                      </div>
                      <a href={`/properties/${visit.property_id}`} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"><Home size={16} /> View property</a>
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <div className="rounded-2xl bg-[#f7fafb] p-4">
                        <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">{isOwner ? "Visitor" : "Property owner"}</p>
                        <p className="mt-1 font-extrabold">{isOwner ? requester?.full_name || "Visitor" : owner?.full_name || "Property owner"}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7fafb] p-4">
                        <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Requested time</p>
                        <p className="mt-1 flex items-center gap-2 font-extrabold"><Clock3 size={15} /> {formatDate(visit.requested_for)}</p>
                      </div>
                      {visit.proposed_for ? <div className="rounded-2xl bg-[#eefaf7] p-4"><p className="text-xs font-bold uppercase tracking-[1px] text-[#52786f]">Proposed time</p><p className="mt-1 font-extrabold text-[#155b50]">{formatDate(visit.proposed_for)}</p></div> : null}
                    </div>

                    <div className="rounded-2xl border border-[#dfe9ed] p-5">
                      <p className="text-sm font-extrabold">Visit request</p>
                      <p className="mt-2 text-sm leading-6 text-[#687987]">{visit.requester_note || visit.owner_note || "No additional notes were added."}</p>

                      {canOwnerAct ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {visit.status === "requested" ? <button type="button" disabled={busy} onClick={() => void updateVisit(visit.id, "confirmed")} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Confirm</button> : null}
                          <button type="button" disabled={busy} onClick={() => void updateVisit(visit.id, "declined")} className="inline-flex items-center gap-2 rounded-xl border border-[#efcccc] bg-[#fff7f7] px-4 py-2.5 text-sm font-bold text-[#8b4b4b] disabled:opacity-50"><X size={16} /> Decline</button>
                        </div>
                      ) : null}

                      {canBuyerAct ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button type="button" disabled={busy} onClick={() => void updateVisit(visit.id, "confirmed")} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Accept proposed time</button>
                        </div>
                      ) : null}

                      {canCancel ? (
                        <button type="button" disabled={busy} onClick={() => void updateVisit(visit.id, "cancelled")} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><X size={16} /> Cancel visit</button>
                      ) : null}

                      {canOwnerAct ? (
                        <div className="mt-5 border-t border-[#e8eef1] pt-5">
                          <p className="text-sm font-extrabold">Propose another time</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <input type="date" value={proposalDate[visit.id] || ""} onChange={(event) => setProposalDate({ ...proposalDate, [visit.id]: event.target.value })} className="rounded-xl border border-[#d7e3e8] px-3 py-2.5 text-sm" />
                            <select value={proposalTime[visit.id] || "09:00"} onChange={(event) => setProposalTime({ ...proposalTime, [visit.id]: event.target.value })} className="rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm">
                              <option value="09:00">9:00 AM</option><option value="11:00">11:00 AM</option><option value="14:00">2:00 PM</option><option value="16:00">4:00 PM</option><option value="18:00">6:00 PM</option>
                            </select>
                          </div>
                          <button type="button" disabled={busy || !proposalDate[visit.id]} onClick={() => { const value = new Date(`${proposalDate[visit.id]}T${proposalTime[visit.id] || "09:00"}:00`).toISOString(); void updateVisit(visit.id, "proposed", value); }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><Clock3 size={16} /> Propose new time</button>
                        </div>
                      ) : null}

                      {!canOwnerAct && !canBuyerAct && !canCancel ? <div className="mt-5 rounded-xl bg-[#f7fafb] px-4 py-3 text-xs font-bold uppercase tracking-[1px] text-[#60737e]">No action required</div> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

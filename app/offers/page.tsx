"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Clock3, Home, IndianRupee, MessageCircle, RotateCcw, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Offer = {
  id: string;
  property_id: string;
  buyer_id: string;
  offer_amount: number;
  message: string | null;
  status: "submitted" | "countered" | "accepted" | "declined" | "withdrawn";
  response_amount: number | null;
  response_message: string | null;
  last_action_by: string | null;
  created_at: string;
  updated_at: string;
};

type Property = { id: string; title: string; city: string | null; locality: string | null; price: number | null; listed_by?: string };
type Event = { id: string; offer_id: string; actor_id: string; action: Offer["status"]; amount: number | null; message: string | null; created_at: string };
type Profile = { id: string; full_name: string | null };

const statusStyles: Record<string, string> = {
  submitted: "border-[#f3d49b] bg-[#fff8e8] text-[#9a6500]",
  countered: "border-[#b9d8f3] bg-[#eef7ff] text-[#28608f]",
  accepted: "border-[#a9dfc7] bg-[#eafaf2] text-[#137a4f]",
  declined: "border-[#efcccc] bg-[#fff2f2] text-[#a24646]",
  withdrawn: "border-[#d7e0e5] bg-[#f2f5f7] text-[#60737e]",
};

function money(value: number | null) {
  return value == null ? "—" : `₹ ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function date(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OffersPage() {
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [sent, setSent] = useState<Offer[]>([]);
  const [received, setReceived] = useState<Offer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [expanded, setExpanded] = useState("");
  const [counterId, setCounterId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [highlightedOffer, setHighlightedOffer] = useState("");

  const offers = tab === "sent" ? sent : received;

  async function notify(event: "new_offer" | "offer_update", offerId: string) {
    const result = await supabase.functions.invoke("notify-enquiry", { body: { event, offer_id: offerId } });
    if (result.error) console.warn("UNLIVO offer notification failed", result.error.message);
  }

  async function load() {
    setLoading(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Please sign in to view your offers.");
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [sentResult, ownedPropertiesResult] = await Promise.all([
      supabase.from("property_offers").select("id,property_id,buyer_id,offer_amount,message,status,response_amount,response_message,last_action_by,created_at,updated_at").eq("buyer_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("properties").select("id,title,city,locality,price,listed_by").eq("listed_by", user.id),
    ]);

    if (sentResult.error) {
      setMessage(sentResult.error.message);
      setLoading(false);
      return;
    }
    if (ownedPropertiesResult.error) {
      setMessage(ownedPropertiesResult.error.message);
      setLoading(false);
      return;
    }

    const owned = (ownedPropertiesResult.data || []) as Property[];
    const ownedIds = owned.map((p) => p.id);
    let receivedRows: Offer[] = [];

    if (ownedIds.length) {
      const result = await supabase.from("property_offers")
        .select("id,property_id,buyer_id,offer_amount,message,status,response_amount,response_message,last_action_by,created_at,updated_at")
        .in("property_id", ownedIds)
        .order("updated_at", { ascending: false });
      if (result.error) {
        setMessage(result.error.message);
        setLoading(false);
        return;
      }
      receivedRows = (result.data || []) as Offer[];
    }

    const sentRows = (sentResult.data || []) as Offer[];
    const allOffers = [...sentRows, ...receivedRows];
    const propertyIds = Array.from(new Set(allOffers.map((o) => o.property_id)));
    const offerIds = Array.from(new Set(allOffers.map((o) => o.id)));

    let propertyRows: Property[] = [...owned];
    if (propertyIds.length) {
      const result = await supabase.from("properties").select("id,title,city,locality,price,listed_by").in("id", propertyIds);
      if (result.data) propertyRows = result.data as Property[];
    }

    let eventRows: Event[] = [];
    let profileRows: Profile[] = [];
    if (offerIds.length) {
      const [eventResult, profileResult] = await Promise.all([
        supabase.from("property_offer_events").select("id,offer_id,actor_id,action,amount,message,created_at").in("offer_id", offerIds).order("created_at", { ascending: true }),
        supabase.rpc("get_property_offer_participant_profiles", { p_offer_ids: offerIds }),
      ]);
      if (eventResult.error) setMessage(eventResult.error.message);
      else eventRows = (eventResult.data || []) as Event[];
      if (profileResult.error) setMessage(profileResult.error.message);
      else profileRows = (profileResult.data || []) as Profile[];
    }

    setSent(sentRows);
    setReceived(receivedRows);
    setProperties(propertyRows);
    setEvents(eventRows);
    setProfiles(profileRows);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("property-offers-my-offers-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "property_offers" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const offerId = params.get("offer") || "";
    if (!offerId) return;
    const isReceived = received.some((o) => o.id === offerId);
    const isSent = sent.some((o) => o.id === offerId);
    if (!isReceived && !isSent) return;
    setTab(isReceived ? "received" : "sent");
    setExpanded(offerId);
    setHighlightedOffer(offerId);
    window.setTimeout(() => document.getElementById("offer-" + offerId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    window.setTimeout(() => setHighlightedOffer(""), 4000);
  }, [sent, received]);

  const propertyFor = (id: string) => properties.find((p) => p.id === id);
  const profileFor = (id: string) => profiles.find((p) => p.id === id)?.full_name || "UNLIVO user";
  const eventsFor = (id: string) => events.filter((e) => e.offer_id === id);

  async function updateOffer(offer: Offer, nextStatus: "accepted" | "declined" | "withdrawn" | "countered") {
    setBusyId(offer.id);
    setMessage("");

    const values: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "countered") {
      const amount = Number(counterAmount);
      if (!amount || amount <= 0) {
        setMessage("Please enter a valid counter offer amount.");
        setBusyId("");
        return;
      }
      values.response_amount = amount;
      values.response_message = counterMessage.trim() || null;
    }
    if (nextStatus === "accepted" && offer.response_amount == null) {
      values.response_amount = offer.offer_amount;
    }

    const result = await supabase.from("property_offers").update(values).eq("id", offer.id);
    if (result.error) {
      setMessage(result.error.message);
      setBusyId("");
      return;
    }

    setCounterId("");
    setCounterAmount("");
    setCounterMessage("");
    await notify("offer_update", offer.id);
    await load();
    setBusyId("");
  }

  if (loading) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader /><div className="container py-24 text-center text-sm text-[#687987]">Loading offers…</div><SiteFooter /></main>;

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-7xl py-10 lg:py-14">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#087f73]">UNLIVO negotiation</p>
          <h1 className="mt-2 text-3xl font-extrabold lg:text-4xl">My Offers</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687987]">Manage every offer you have sent or received, including counters, responses, and the full negotiation history.</p>
        </div>

        <div className="mt-7 flex gap-2 rounded-2xl border border-[#dfe9ed] bg-white p-1.5 shadow-sm">
          <button onClick={() => setTab("sent")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${tab === "sent" ? "bg-[#071d2d] text-white" : "text-[#547083] hover:bg-[#f3f8f7]"}`}>Offers Sent <span className="ml-1 opacity-70">({sent.length})</span></button>
          <button onClick={() => setTab("received")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${tab === "received" ? "bg-[#071d2d] text-white" : "text-[#547083] hover:bg-[#f3f8f7]"}`}>Offers Received <span className="ml-1 opacity-70">({received.length})</span></button>
        </div>

        {message ? <div className="mt-5 rounded-xl border border-[#efcccc] bg-white px-4 py-3 text-sm font-bold text-[#8b4b4b]">{message}</div> : null}

        {!offers.length ? (
          <div className="mt-6 rounded-3xl border border-[#dfe9ed] bg-white p-12 text-center shadow-sm">
            <IndianRupee className="mx-auto text-[#0bb89b]" size={40} />
            <h2 className="mt-4 text-xl font-extrabold">{tab === "sent" ? "No offers sent yet" : "No offers received yet"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">{tab === "sent" ? "When you make an offer on a sale property, it will appear here." : "Offers made on your sale properties will appear here."}</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-[#dfe9ed] bg-white shadow-sm">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-[#f7fafb] text-[10px] uppercase tracking-[1.2px] text-[#7b8c97]">
                  <tr>
                    <th className="px-5 py-4 font-extrabold">Property</th>
                    <th className="px-5 py-4 font-extrabold">{tab === "sent" ? "Your offer" : "Buyer"}</th>
                    <th className="px-5 py-4 font-extrabold">Current response</th>
                    <th className="px-5 py-4 font-extrabold">Status</th>
                    <th className="px-5 py-4 font-extrabold">Updated</th>
                    <th className="px-5 py-4 font-extrabold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => {
                    const property = propertyFor(offer.property_id);
                    const history = eventsFor(offer.id);
                    const expandedRow = expanded === offer.id;
                    const waitingForBuyer = tab === "received" && offer.status === "countered" && offer.last_action_by === userId;
                    const ownerCanRespond = tab === "received" && (offer.status === "submitted" || (offer.status === "countered" && offer.last_action_by !== userId));
                    const buyerCanRespond = tab === "sent" && offer.status === "countered" && offer.last_action_by !== userId;
                    const busy = busyId === offer.id;
                    return (
                      <tr id={"offer-" + offer.id} key={offer.id} className={"border-t border-[#e8eef1] align-top " + (highlightedOffer === offer.id ? "bg-[#f0fbf8]" : "")}>
                        <td colSpan={6} className="p-0">
                          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.6fr]">
                            <div className="px-5 py-5">
                              <p className="font-extrabold">{property?.title || "Property"}</p>
                              <p className="mt-1 text-xs text-[#687987]">{[property?.locality, property?.city].filter(Boolean).join(", ") || "Location unavailable"}</p>
                            </div>
                            <div className="px-5 py-5">
                              {tab === "sent" ? <><p className="font-extrabold">{money(offer.offer_amount)}</p><p className="mt-1 text-xs text-[#687987]">{date(offer.created_at)}</p></> : <><p className="font-extrabold">{profileFor(offer.buyer_id)}</p><p className="mt-1 text-xs text-[#687987]">{money(offer.offer_amount)}</p></>}
                            </div>
                            <div className="px-5 py-5">
                              <p className="font-extrabold">{offer.response_amount != null ? money(offer.response_amount) : "—"}</p>
                              {offer.response_message ? <p className="mt-1 line-clamp-2 text-xs text-[#687987]">{offer.response_message}</p> : null}
                            </div>
                            <div className="px-5 py-5">
                              <span className={"inline-flex rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] " + (statusStyles[offer.status] || statusStyles.withdrawn)}>{label(offer.status)}</span>
                              {waitingForBuyer || buyerCanRespond ? <p className="mt-2 text-[10px] font-bold text-[#087f73]">{waitingForBuyer ? "Waiting for buyer" : "Action needed"}</p> : null}
                            </div>
                            <div className="px-5 py-5 text-xs text-[#687987]">{date(offer.updated_at)}</div>
                            <div className="px-5 py-5">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => setExpanded(expandedRow ? "" : offer.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53]"><ChevronDown size={14} className={expandedRow ? "rotate-180" : ""} /> Details</button>
                                <a href={"/properties/" + offer.property_id} className="inline-flex items-center gap-1 rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53]"><Home size={14} /> Property</a>
                              </div>
                              {ownerCanRespond ? <div className="mt-2 flex flex-wrap gap-2">
                                <button disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="rounded-lg bg-[#123b53] px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14} className="inline" /> Accept</button>
                                <button disabled={busy} onClick={() => void updateOffer(offer, "declined")} className="rounded-lg border border-[#efcccc] px-2.5 py-2 text-xs font-bold text-[#8b4b4b] disabled:opacity-50"><X size={14} className="inline" /> Decline</button>
                                <button disabled={busy} onClick={() => { setCounterId(offer.id); setCounterAmount(String(offer.offer_amount)); setCounterMessage(""); }} className="rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53] disabled:opacity-50"><RotateCcw size={14} className="inline" /> Counter</button>
                              </div> : null}
                              {tab === "sent" && (offer.status === "submitted" || buyerCanRespond) ? <div className="mt-2 flex flex-wrap gap-2">
                                {buyerCanRespond ? <button disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="rounded-lg bg-[#123b53] px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14} className="inline" /> Accept counter</button> : null}
                                {offer.status !== "withdrawn" && offer.status !== "accepted" && offer.status !== "declined" ? <button disabled={busy} onClick={() => void updateOffer(offer, "withdrawn")} className="rounded-lg border border-[#efcccc] px-2.5 py-2 text-xs font-bold text-[#8b4b4b] disabled:opacity-50"><X size={14} className="inline" /> Withdraw</button> : null}
                                {buyerCanRespond ? <button disabled={busy} onClick={() => { setCounterId(offer.id); setCounterAmount(String(offer.response_amount ?? offer.offer_amount)); setCounterMessage(""); }} className="rounded-lg border border-[#cbdde3] px-2.5 py-2 text-xs font-bold text-[#123b53] disabled:opacity-50"><MessageCircle size={14} className="inline" /> Counter</button> : null}
                              </div> : null}
                            </div>
                          </div>
                          {counterId === offer.id ? <div className="border-t border-[#e8eef1] bg-[#f7fafb] px-5 py-4">
                            <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                              <label className="text-xs font-bold text-[#547083]">Counter amount (₹)<input type="number" min="1" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm text-[#102638]" /></label>
                              <label className="text-xs font-bold text-[#547083]">Message<input value={counterMessage} onChange={(e) => setCounterMessage(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm text-[#102638]" placeholder="Optional" /></label>
                              <button disabled={busy} onClick={() => void updateOffer(offer, "countered")} className="rounded-xl bg-[#071d2d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Send counter</button>
                            </div>
                          </div> : null}
                          {expandedRow ? <div className="border-t border-[#e8eef1] bg-white px-5 py-5">
                            <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
                              <div>
                                <p className="text-xs font-extrabold uppercase tracking-[1px] text-[#7b8c97]">Messages</p>
                                <div className="mt-3 space-y-2">
                                  {offer.message ? <div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.8px] text-[#7b8c97]">Original offer</p><p className="mt-1 text-sm leading-5 text-[#687987]">{offer.message}</p></div> : null}
                                  {offer.response_message ? <div className="rounded-xl bg-[#eefaf7] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.8px] text-[#52786f]">Current response</p><p className="mt-1 text-sm leading-5 text-[#52786f]">{offer.response_message}</p></div> : null}
                                  {!offer.message && !offer.response_message ? <p className="text-sm text-[#687987]">No messages attached.</p> : null}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 text-sm font-extrabold"><Clock3 size={16} className="text-[#0bb89b]" /> Negotiation history</div>
                                <div className="mt-3 grid gap-2">
                                  {history.map((event) => <div key={event.id} className="rounded-xl bg-[#f7fafb] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-[.8px] text-[#547083]">{label(event.action)}</p><p className="text-[11px] text-[#7b8c97]">{date(event.created_at)}</p></div><p className="mt-1 text-sm font-bold">{event.amount != null ? money(event.amount) : "—"} <span className="font-normal text-[#687987]">· {event.actor_id === userId ? "You" : profileFor(event.actor_id)}</span></p>{event.message ? <p className="mt-1 text-sm leading-5 text-[#687987]">{event.message}</p> : null}</div>)}
                                  {!history.length ? <p className="text-sm text-[#687987]">No negotiation history yet.</p> : null}
                                </div>
                              </div>
                            </div>
                          </div> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#e8eef1] md:hidden">
              {offers.map((offer) => {
                const property = propertyFor(offer.property_id);
                const history = eventsFor(offer.id);
                const ownerCanRespond = tab === "received" && (offer.status === "submitted" || (offer.status === "countered" && offer.last_action_by !== userId));
                const buyerCanRespond = tab === "sent" && offer.status === "countered" && offer.last_action_by !== userId;
                const busy = busyId === offer.id;
                return <article id={"offer-" + offer.id} key={offer.id} className={"p-5 " + (highlightedOffer === offer.id ? "bg-[#f0fbf8]" : "")}>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold">{property?.title || "Property"}</h2><p className="mt-1 text-xs text-[#687987]">{[property?.locality, property?.city].filter(Boolean).join(", ")}</p></div><span className={"shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase " + (statusStyles[offer.status] || statusStyles.withdrawn)}>{label(offer.status)}</span></div>
                  <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[10px] uppercase tracking-[1px] text-[#7b8c97]">{tab === "sent" ? "Your offer" : "Buyer offer"}</p><p className="mt-1 font-extrabold">{tab === "sent" ? money(offer.offer_amount) : profileFor(offer.buyer_id)}</p></div><div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[10px] uppercase tracking-[1px] text-[#7b8c97]">Response</p><p className="mt-1 font-extrabold">{money(offer.response_amount)}</p></div></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setExpanded(expanded === offer.id ? "" : offer.id)} className="rounded-lg border border-[#cbdde3] px-3 py-2 text-xs font-bold text-[#123b53]">{expanded === offer.id ? "Hide details" : "Details"}</button>
                    {ownerCanRespond ? <><button disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="rounded-lg bg-[#123b53] px-3 py-2 text-xs font-bold text-white">Accept</button><button disabled={busy} onClick={() => void updateOffer(offer, "declined")} className="rounded-lg border border-[#efcccc] px-3 py-2 text-xs font-bold text-[#8b4b4b]">Decline</button><button disabled={busy} onClick={() => { setCounterId(offer.id); setCounterAmount(String(offer.offer_amount)); }} className="rounded-lg border border-[#cbdde3] px-3 py-2 text-xs font-bold text-[#123b53]">Counter</button></> : null}
                    {buyerCanRespond ? <button disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="rounded-lg bg-[#123b53] px-3 py-2 text-xs font-bold text-white">Accept counter</button> : null}
                    {tab === "sent" && !["accepted","declined","withdrawn"].includes(offer.status) ? <button disabled={busy} onClick={() => void updateOffer(offer, "withdrawn")} className="rounded-lg border border-[#efcccc] px-3 py-2 text-xs font-bold text-[#8b4b4b]">Withdraw</button> : null}
                  </div>
                  {counterId === offer.id ? <div className="mt-3 rounded-xl bg-[#f7fafb] p-3"><input type="number" min="1" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} className="w-full rounded-lg border border-[#d7e3e8] bg-white px-3 py-2 text-sm" placeholder="Counter amount" /><input value={counterMessage} onChange={(e) => setCounterMessage(e.target.value)} className="mt-2 w-full rounded-lg border border-[#d7e3e8] bg-white px-3 py-2 text-sm" placeholder="Message (optional)" /><button disabled={busy} onClick={() => void updateOffer(offer, "countered")} className="mt-2 rounded-lg bg-[#071d2d] px-3 py-2 text-xs font-bold text-white">Send counter</button></div> : null}
                  {expanded === offer.id ? <div className="mt-4 rounded-xl border border-[#e8eef1] p-3"><p className="text-xs font-extrabold">Negotiation history</p><div className="mt-3 space-y-2">{history.map((event) => <div key={event.id} className="rounded-lg bg-[#f7fafb] p-3 text-xs"><p className="font-bold">{label(event.action)} · {money(event.amount)}</p><p className="mt-1 text-[#687987]">{event.actor_id === userId ? "You" : profileFor(event.actor_id)} · {date(event.created_at)}</p>{event.message ? <p className="mt-1 text-[#687987]">{event.message}</p> : null}</div>)}</div></div> : null}
                </article>;
              })}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

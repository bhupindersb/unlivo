"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Home, IndianRupee, MessageCircle, RotateCcw, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Offer = {
  id: string;
  property_id: string;
  buyer_id: string;
  offer_amount: number;
  message: string | null;
  status: string;
  response_amount: number | null;
  response_message: string | null;
  last_action_by: string | null;
  created_at: string;
  updated_at: string;
};

type Property = {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
};

type Event = {
  id: string;
  offer_id: string;
  actor_id: string;
  action: string;
  amount: number | null;
  message: string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string | null };

const statusStyles: Record<string, string> = {
  submitted: "border-[#f3d49b] bg-[#fff8e8] text-[#9a6500]",
  countered: "border-[#b9d8f3] bg-[#eef7ff] text-[#28608f]",
  accepted: "border-[#a9dfc7] bg-[#eafaf2] text-[#137a4f]",
  declined: "border-[#efcccc] bg-[#fff2f2] text-[#a24646]",
  withdrawn: "border-[#d7e0e5] bg-[#f2f5f7] text-[#60737e]",
};

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return `₹ ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

export default function OffersPage() {
  const [userId, setUserId] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [counterId, setCounterId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [highlightedOffer, setHighlightedOffer] = useState("");

  async function loadOffers() {
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Please sign in to view your offers.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("property_offers")
      .select("id, property_id, buyer_id, offer_amount, message, status, response_amount, response_message, last_action_by, created_at, updated_at")
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Offer[];
    const propertyIds = Array.from(new Set(rows.map((row) => row.property_id)));
    const offerIds = rows.map((row) => row.id);

    let propertyRows: Property[] = [];
    let eventRows: Event[] = [];
    let profileRows: Profile[] = [];

    if (propertyIds.length) {
      const result = await supabase
        .from("properties")
        .select("id, title, city, locality, price")
        .in("id", propertyIds);
      if (result.data) propertyRows = result.data as Property[];
    }

    if (offerIds.length) {
      const result = await supabase
        .from("property_offer_events")
        .select("id, offer_id, actor_id, action, amount, message, created_at")
        .in("offer_id", offerIds)
        .order("created_at", { ascending: true });
      if (result.data) eventRows = result.data as Event[];

      const profileResult = await supabase.rpc("get_property_offer_participant_profiles", {
        p_offer_ids: offerIds,
      });
      if (profileResult.data) profileRows = profileResult.data as Profile[];
    }

    setOffers(rows);
    setProperties(propertyRows);
    setEvents(eventRows);
    setProfiles(profileRows);
    setLoading(false);
  }

  useEffect(() => {
    void loadOffers();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("property-offers-realtime-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "property_offers", filter: "buyer_id=eq." + userId },
        () => { void loadOffers(); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const offerId = new URLSearchParams(window.location.search).get("offer") || "";
    if (!offerId || !offers.some((offer) => offer.id === offerId)) return;
    setHighlightedOffer(offerId);
    window.setTimeout(() => {
      document.getElementById("offer-" + offerId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [offers]);

  function propertyFor(id: string) {
    return properties.find((property) => property.id === id);
  }

  function eventsFor(id: string) {
    return events.filter((event) => event.offer_id === id);
  }

  function buyerName(id: string) {
    return profiles.find((profile) => profile.id === id)?.full_name || "You";
  }

  async function updateOffer(offer: Offer, status: "accepted" | "withdrawn" | "countered") {
    setBusyId(offer.id);
    setMessage("");

    const values: Record<string, unknown> = { status };
    if (status === "countered") {
      const amount = Number(counterAmount);
      if (!amount || amount <= 0) {
        setMessage("Please enter a valid counter offer amount.");
        setBusyId("");
        return;
      }
      values.response_amount = amount;
      values.response_message = counterMessage.trim() || null;
    }

    const { error } = await supabase.from("property_offers").update(values).eq("id", offer.id);
    if (error) {
      setMessage(error.message);
      setBusyId("");
      return;
    }

    setCounterId("");
    setCounterAmount("");
    setCounterMessage("");
    await loadOffers();
    setBusyId("");
  }

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-6xl py-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO negotiation</p>
            <h1 className="mt-2 text-4xl font-extrabold">My Offers</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">Track your property offers, owner responses and negotiation history in one place.</p>
          </div>
          <a href="/properties" className="rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-sm font-bold text-[#123b53]">Browse properties</a>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm"><p className="text-sm font-bold text-[#687987]">Loading your offers...</p></div>
        ) : message && offers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#efcccc] bg-white p-10 text-center shadow-sm"><p className="text-sm font-bold text-[#8b4b4b]">{message}</p></div>
        ) : offers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm">
            <IndianRupee className="mx-auto text-[#0bb89b]" size={40} />
            <h2 className="mt-4 text-xl font-extrabold">No offers yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">When you make an offer on a sale property, it will appear here.</p>
            <a href="/properties" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-5 py-3 text-sm font-bold text-white">Browse properties</a>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {message ? <div className="rounded-xl border border-[#efcccc] bg-white px-4 py-3 text-sm font-bold text-[#8b4b4b]">{message}</div> : null}
            {offers.map((offer) => {
              const property = propertyFor(offer.property_id);
              const history = eventsFor(offer.id);
              const latestCounter = offer.response_amount;
              const waitingForOwner = offer.status === "submitted";
              const buyerCanRespond = offer.status === "countered" && offer.last_action_by !== userId;
              const canWithdraw = ["submitted", "countered"].includes(offer.status);
              const canCounter = buyerCanRespond;
              const isCountering = counterId === offer.id;
              const busy = busyId === offer.id;

              return (
                <article id={"offer-" + offer.id} key={offer.id} className={"overflow-hidden rounded-3xl border bg-white shadow-sm " + (highlightedOffer === offer.id ? "border-[#0bb89b] ring-2 ring-[#0bb89b]/20" : "border-[#dfe9ed]")}>
                  <div className="border-b border-[#e8eef1] p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={"inline-flex items-center rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[1.2px] shadow-sm " + (statusStyles[offer.status] || statusStyles.withdrawn)}>{label(offer.status)}</span>
                          {waitingForOwner ? <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">Waiting for owner</span> : null}
                          {buyerCanRespond ? <span className="rounded-full bg-[#e9faf6] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#087f73]">Your response needed</span> : null}
                        </div>
                        <h2 className="mt-3 text-xl font-extrabold">{property?.title || "Property"}</h2>
                        <p className="mt-1 text-sm text-[#687987]">{[property?.locality, property?.city].filter(Boolean).join(", ") || "Property location"}</p>
                      </div>
                      <a href={"/properties/" + offer.property_id} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"><Home size={16} /> View property</a>
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 lg:grid-cols-[.8fr_1.2fr]">
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-[#f7fafb] p-4">
                        <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Your original offer</p>
                        <p className="mt-1 text-2xl font-extrabold">{formatMoney(offer.offer_amount)}</p>
                        <p className="mt-1 text-xs text-[#687987]">{formatDate(offer.created_at)}</p>
                      </div>
                      {latestCounter != null ? (
                        <div className="rounded-2xl bg-[#eefaf7] p-4">
                          <p className="text-xs font-bold uppercase tracking-[1px] text-[#52786f]">Current counter offer</p>
                          <p className="mt-1 text-2xl font-extrabold text-[#155b50]">{formatMoney(latestCounter)}</p>
                          {offer.response_message ? <p className="mt-2 text-sm leading-5 text-[#52786f]">{offer.response_message}</p> : null}
                        </div>
                      ) : null}
                      {offer.message ? (
                        <div className="rounded-2xl border border-[#dfe9ed] p-4">
                          <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Your message</p>
                          <p className="mt-2 text-sm leading-6 text-[#687987]">{offer.message}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-[#dfe9ed] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-extrabold">Negotiation history</p>
                        <Clock3 size={17} className="text-[#0bb89b]" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {history.map((event) => (
                          <div key={event.id} className="rounded-xl bg-[#f7fafb] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-extrabold uppercase tracking-[.8px] text-[#547083]">{label(event.action)}</p>
                              <p className="text-[11px] text-[#7b8c97]">{formatDate(event.created_at)}</p>
                            </div>
                            <p className="mt-1 text-sm font-bold">{event.amount != null ? formatMoney(event.amount) : "—"} <span className="font-normal text-[#687987]">· {event.actor_id === userId ? buyerName(event.actor_id) : "Property owner"}</span></p>
                            {event.message ? <p className="mt-1 text-sm leading-5 text-[#687987]">{event.message}</p> : null}
                          </div>
                        ))}
                        {!history.length ? <p className="text-sm text-[#687987]">No negotiation history yet.</p> : null}
                      </div>

                      {buyerCanRespond ? (
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e8eef1] pt-5">
                          <button type="button" disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Accept counter</button>
                          <button type="button" disabled={busy} onClick={() => { setCounterId(isCountering ? "" : offer.id); setCounterAmount(latestCounter ? String(latestCounter) : ""); setCounterMessage(""); }} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><RotateCcw size={16} /> Counter offer</button>
                        </div>
                      ) : null}

                      {canWithdraw ? (
                        <button type="button" disabled={busy} onClick={() => void updateOffer(offer, "withdrawn")} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><X size={16} /> Withdraw offer</button>
                      ) : null}

                      {isCountering && canCounter ? (
                        <div className="mt-4 rounded-2xl bg-[#f7fafb] p-4">
                          <p className="text-sm font-extrabold">Your counter offer</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="text-xs font-bold text-[#547083]">Amount (₹)<input type="number" min="1" value={counterAmount} onChange={(event) => setCounterAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm text-[#102638] outline-none focus:border-[#0bb89b]" /></label>
                            <label className="text-xs font-bold text-[#547083]">Message<input value={counterMessage} onChange={(event) => setCounterMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm text-[#102638] outline-none focus:border-[#0bb89b]" placeholder="Optional" /></label>
                          </div>
                          <button type="button" disabled={busy} onClick={() => void updateOffer(offer, "countered")} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#071d2d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><MessageCircle size={16} /> Send counter</button>
                        </div>
                      ) : null}
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

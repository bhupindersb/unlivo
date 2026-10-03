"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Home, IndianRupee, MessageCircle, RotateCcw, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import { supabase } from "../../lib/supabase";

type Property = {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number | null;
};

type Offer = {
  id: string;
  property_id: string;
  buyer_id: string;
  offer_amount: number;
  message: string | null;
  response_amount: number | null;
  response_message: string | null;
  last_action_by: string | null;
  status: "submitted" | "countered" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  updated_at: string;
};

type Event = {
  id: string;
  offer_id: string;
  actor_id: string;
  action: Offer["status"];
  amount: number | null;
  message: string | null;
  created_at: string;
};

type BuyerProfile = { id: string; full_name: string | null };

const statusStyles: Record<string, string> = {
  submitted: "border-[#ead9aa] bg-[#fff8e8] text-[#7a5d12]",
  countered: "border-[#cbdcf0] bg-[#f1f7fd] text-[#315b91]",
  accepted: "border-[#b9e4d8] bg-[#eefaf7] text-[#087f73]",
  declined: "border-[#efcccc] bg-[#fff5f5] text-[#8b4b4b]",
  withdrawn: "border-[#dfe5e8] bg-[#f5f7f8] text-[#60737e]",
};

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return `₹ ${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OfferInboxPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [buyers, setBuyers] = useState<BuyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [counterId, setCounterId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [highlightedOffer, setHighlightedOffer] = useState("");

  const loadOffers = async (uid: string) => {
    if (!supabase) return;

    const propertyResult = await supabase
      .from("properties")
      .select("id,title,city,locality,price")
      .eq("listed_by", uid)
      .order("created_at", { ascending: false });

    if (propertyResult.error) {
      setMessage(propertyResult.error.message);
      setLoading(false);
      return;
    }

    const ownedProperties = (propertyResult.data || []) as Property[];
    setProperties(ownedProperties);

    if (!ownedProperties.length) {
      setOffers([]);
      setEvents([]);
      setBuyers([]);
      setLoading(false);
      return;
    }

    const ids = ownedProperties.map((property) => property.id);
    const offerResult = await supabase
      .from("property_offers")
      .select("id,property_id,buyer_id,offer_amount,message,response_amount,response_message,last_action_by,status,created_at,updated_at")
      .in("property_id", ids)
      .order("updated_at", { ascending: false });

    if (offerResult.error) {
      setMessage(offerResult.error.message);
      setLoading(false);
      return;
    }

    const nextOffers = (offerResult.data || []) as Offer[];
    setOffers(nextOffers);

    if (!nextOffers.length) {
      setEvents([]);
      setBuyers([]);
      setLoading(false);
      return;
    }

    const offerIds = nextOffers.map((offer) => offer.id);
    const [eventResult, buyerResult] = await Promise.all([
      supabase
        .from("property_offer_events")
        .select("id,offer_id,actor_id,action,amount,message,created_at")
        .in("offer_id", offerIds)
        .order("created_at", { ascending: true }),
      supabase.rpc("get_property_offer_participant_profiles", { p_offer_ids: offerIds }),
    ]);

    if (!eventResult.error) setEvents((eventResult.data || []) as Event[]);
    if (!buyerResult.error) setBuyers((buyerResult.data || []) as BuyerProfile[]);
    if (eventResult.error) setMessage(eventResult.error.message);
    if (buyerResult.error) setMessage(buyerResult.error.message);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;

    async function boot() {
      if (!supabase) {
        setMessage("UNLIVO is not connected to Supabase.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;

      if (!active) return;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      await loadOffers(uid);
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel("property-offer-owner-realtime-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "property_offers" },
        () => {
          void loadOffers(userId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const offerId = params.get("offer");
    if (!offerId) return;

    setHighlightedOffer(offerId);
    const timer = window.setTimeout(() => {
      document.getElementById("offer-" + offerId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);

    const clear = window.setTimeout(() => setHighlightedOffer(""), 3500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [offers]);

  const propertyFor = (propertyId: string) => properties.find((property) => property.id === propertyId);
  const buyerFor = (buyerId: string) => buyers.find((buyer) => buyer.id === buyerId)?.full_name || "Buyer";
  const eventsFor = (offerId: string) => events.filter((event) => event.offer_id === offerId);

  const updateOffer = async (
    offer: Offer,
    nextStatus: "countered" | "accepted" | "declined",
  ) => {
    if (!supabase) return;

    setBusyId(offer.id);
    setMessage("");

    if (nextStatus === "countered") {
      const amount = Number(counterAmount);
      if (!amount || amount <= 0) {
        setMessage("Please enter a valid counter offer amount.");
        setBusyId("");
        return;
      }

      const result = await supabase
        .from("property_offers")
        .update({
          status: "countered",
          response_amount: amount,
          response_message: counterMessage.trim() || null,
        })
        .eq("id", offer.id);

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setCounterId("");
        setCounterAmount("");
        setCounterMessage("");
      }
    }

    if (nextStatus === "accepted") {
      const result = await supabase
        .from("property_offers")
        .update({
          status: "accepted",
          response_amount: offer.response_amount ?? offer.offer_amount,
          response_message: offer.response_message,
        })
        .eq("id", offer.id);

      if (result.error) setMessage(result.error.message);
    }

    if (nextStatus === "declined") {
      const result = await supabase
        .from("property_offers")
        .update({ status: "declined" })
        .eq("id", offer.id);

      if (result.error) setMessage(result.error.message);
    }

    setBusyId("");
    if (userId) {
      void supabase.functions.invoke("notify-enquiry", { body: { event: "offer_update", offer_id: offer.id } });
      void loadOffers(userId);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
        <SiteHeader />
        <div className="container py-24 text-center text-sm text-[#687987]">Loading offer inbox…</div>
        <SiteFooter />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
        <SiteHeader />
        <section className="container py-20">
          <div className="mx-auto max-w-2xl rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm">
            <IndianRupee className="mx-auto text-[#0bb89b]" size={40} />
            <h1 className="mt-4 text-2xl font-extrabold">Offer Inbox</h1>
            <p className="mt-2 text-sm leading-6 text-[#687987]">Sign in to manage offers received on your properties.</p>
            <a href="/login?next=/offer-inbox" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-5 py-3 text-sm font-bold text-white">Sign in</a>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container py-10 lg:py-14">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#087f73]">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold lg:text-4xl">Offer Inbox</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687987]">Review buyer offers, respond with a counter offer, and keep the negotiation history in one place.</p>
        </div>

        {message ? <div className="mt-6 rounded-xl border border-[#efcccc] bg-white px-4 py-3 text-sm font-bold text-[#8b4b4b]">{message}</div> : null}

        {!properties.length ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm">
            <Home className="mx-auto text-[#0bb89b]" size={40} />
            <h2 className="mt-4 text-xl font-extrabold">No properties listed yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">Once you list a sale property and receive an offer, it will appear here.</p>
            <a href="/post-property" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-5 py-3 text-sm font-bold text-white">Post a property</a>
          </div>
        ) : !offers.length ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm">
            <IndianRupee className="mx-auto text-[#0bb89b]" size={40} />
            <h2 className="mt-4 text-xl font-extrabold">No offers yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">Offers received on your properties will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {offers.map((offer) => {
              const property = propertyFor(offer.property_id);
              const history = eventsFor(offer.id);
              const waitingForBuyer = offer.status === "countered" && offer.last_action_by === userId;
              const ownerCanRespond = offer.status === "submitted" || (offer.status === "countered" && offer.last_action_by !== userId);
              const isCountering = counterId === offer.id;
              const busy = busyId === offer.id;

              return (
                <article id={"offer-" + offer.id} key={offer.id} className={"overflow-hidden rounded-3xl border bg-white shadow-sm " + (highlightedOffer === offer.id ? "border-[#0bb89b] ring-2 ring-[#0bb89b]/20" : "border-[#dfe9ed]")}>
                  <div className="border-b border-[#e8eef1] p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={"inline-flex items-center rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[1.2px] shadow-sm " + (statusStyles[offer.status] || statusStyles.withdrawn)}>{label(offer.status)}</span>
                          {offer.status === "submitted" ? <span className="rounded-full bg-[#fff8e8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#7a5d12]">Action needed</span> : null}
                          {waitingForBuyer ? <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">Waiting for buyer</span> : null}
                        </div>
                        <h2 className="mt-3 text-xl font-extrabold">{property?.title || "Property"}</h2>
                        <p className="mt-1 text-sm text-[#687987]">{[property?.locality, property?.city].filter(Boolean).join(", ") || "Property location"}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Buyer</p>
                        <p className="mt-1 text-sm font-extrabold">{buyerFor(offer.buyer_id)}</p>
                        <a href={"/properties/" + offer.property_id} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"><Home size={16} /> View property</a>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 lg:grid-cols-[.8fr_1.2fr]">
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-[#f7fafb] p-4">
                        <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Buyer’s offer</p>
                        <p className="mt-1 text-2xl font-extrabold">{formatMoney(offer.offer_amount)}</p>
                        <p className="mt-1 text-xs text-[#687987]">{formatDate(offer.created_at)}</p>
                      </div>
                      {offer.response_amount != null ? (
                        <div className="rounded-2xl bg-[#eefaf7] p-4">
                          <p className="text-xs font-bold uppercase tracking-[1px] text-[#52786f]">Current response</p>
                          <p className="mt-1 text-2xl font-extrabold text-[#155b50]">{formatMoney(offer.response_amount)}</p>
                          {offer.response_message ? <p className="mt-2 text-sm leading-5 text-[#52786f]">{offer.response_message}</p> : null}
                        </div>
                      ) : null}
                      {offer.message ? (
                        <div className="rounded-2xl border border-[#dfe9ed] p-4">
                          <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">Buyer message</p>
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
                            <p className="mt-1 text-sm font-bold">{event.amount != null ? formatMoney(event.amount) : "—"} <span className="font-normal text-[#687987]">· {event.actor_id === userId ? "You" : buyerFor(event.actor_id)}</span></p>
                            {event.message ? <p className="mt-1 text-sm leading-5 text-[#687987]">{event.message}</p> : null}
                          </div>
                        ))}
                        {!history.length ? <p className="text-sm text-[#687987]">No negotiation history yet.</p> : null}
                      </div>

                      {ownerCanRespond ? (
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e8eef1] pt-5">
                          <button type="button" disabled={busy} onClick={() => void updateOffer(offer, "accepted")} className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Accept offer</button>
                          <button type="button" disabled={busy} onClick={() => void updateOffer(offer, "declined")} className="inline-flex items-center gap-2 rounded-xl border border-[#efcccc] px-4 py-2.5 text-sm font-bold text-[#8b4b4b] disabled:opacity-50"><X size={16} /> Decline</button>
                          <button type="button" disabled={busy} onClick={() => { setCounterId(isCountering ? "" : offer.id); setCounterAmount(offer.response_amount != null ? String(offer.response_amount) : String(offer.offer_amount)); setCounterMessage(""); }} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50"><RotateCcw size={16} /> Counter offer</button>
                        </div>
                      ) : null}

                      {isCountering && ownerCanRespond ? (
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

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, ShieldCheck } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Property = { id: string; title: string; status: string; city: string; locality: string; created_at: string };
type Review = { decision: string; notes: string | null; assigned_to: string | null; updated_at: string };

const statusCopy: Record<string, { title: string; body: string }> = {
  pending_review: { title: "Your property has been submitted", body: "Your listing is safely saved and is now waiting for UNLIVO review. It will not appear publicly until it is approved." },
  published: { title: "Your property is live", body: "Your listing has been approved and is now visible to buyers and tenants on UNLIVO." },
  rejected: { title: "Your property needs attention", body: "The review team has not approved this listing yet. Please check the review note below before submitting it again." },
  draft: { title: "Your draft is saved", body: "This listing is saved privately and has not been submitted for review." },
};

export default function PropertyConfirmationPage() {
  const [property, setProperty] = useState<Property | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setError("UNLIVO is not connected to the database."); setLoading(false); return; }
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (!id) { setError("No property was specified."); setLoading(false); return; }

      const result = await supabase.from("properties").select("id,title,status,city,locality,created_at").eq("id", id).maybeSingle();
      if (result.error || !result.data) { setError(result.error?.message || "We could not find this property."); setLoading(false); return; }
      setProperty(result.data as Property);

      const reviewResult = await supabase.from("property_reviews").select("decision,notes,assigned_to,updated_at").eq("property_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!reviewResult.error) setReview(reviewResult.data as Review | null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader /><div className="container py-24 text-center text-sm text-[#687987]">Loading confirmation…</div><SiteFooter /></main>;
  if (error || !property) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader /><section className="container py-24 text-center"><h1 className="text-2xl font-extrabold">Submission unavailable</h1><p className="mt-3 text-sm text-[#687987]">{error}</p><a href="/post-property" className="mt-7 inline-flex rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">Post another property</a></section><SiteFooter /></main>;

  const copy = statusCopy[property.status] || statusCopy.pending_review;
  const isLive = property.status === "published";

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-3xl py-12 lg:py-20">
        <div className="rounded-[2rem] border border-[#dfe9ed] bg-white p-7 text-center shadow-sm lg:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e9faf6] text-[#0b8f79]">
            {isLive ? <CheckCircle2 size={34} /> : <Clock3 size={34} />}
          </div>
          <p className="mt-7 text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO Listing Status</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] lg:text-4xl">{copy.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#687987]">{copy.body}</p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[#dfe9ed] bg-[#f8fbfc] p-5 text-left">
            <p className="text-xs font-bold uppercase tracking-[1.4px] text-[#547083]">Property</p>
            <h2 className="mt-2 text-lg font-extrabold">{property.title}</h2>
            <p className="mt-1 text-sm text-[#687987]">{[property.locality, property.city].filter(Boolean).join(", ")}</p>
            <div className="mt-4 flex items-center justify-between border-t border-[#e4ecef] pt-4 text-sm">
              <span className="text-[#687987]">Current status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[1px] ${isLive ? "bg-[#e9faf6] text-[#087f73]" : property.status === "rejected" ? "bg-[#fff1f1] text-[#9b4d4d]" : "bg-[#fff8e7] text-[#8a691f]"}`}>{property.status.replaceAll("_", " ")}</span>
            </div>
          </div>

          {property.status === "pending_review" && <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-2xl border border-[#d9e7ed] bg-white p-5 text-left"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-[#0b8f79]" /><div><p className="text-sm font-extrabold">What happens next?</p><p className="mt-1 text-sm leading-6 text-[#687987]">An UNLIVO admin or assigned reviewer will check the listing. Once approved, it can become visible on the website. You can return to this page later to see the latest status.</p></div></div>}

          {review?.notes && <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#eadfca] bg-[#fffaf0] p-5 text-left"><p className="text-xs font-bold uppercase tracking-[1.4px] text-[#8a691f]">Review note</p><p className="mt-2 text-sm leading-6 text-[#5f563f]">{review.notes}</p></div>}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={`/properties/${property.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white hover:bg-[#102f44]"><ExternalLink size={17} /> View my property</a>
            <a href="/post-property" className="inline-flex cursor-pointer rounded-xl border border-[#cbdde3] bg-white px-6 py-3 text-sm font-bold text-[#123b53]">Post another property</a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

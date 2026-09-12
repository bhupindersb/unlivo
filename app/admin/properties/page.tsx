"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, UserRound, XCircle } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Property = { id: string; title: string; city: string; locality: string; price: number | null; purpose: string; status: string; created_at: string };
type Review = { id: string; property_id: string; assigned_to: string | null; decision: string; notes: string | null };
type Reviewer = { id: string; full_name: string | null; role: string };

function price(property: Property) {
  if (property.purpose === "rent") return "For rent";
  if (property.price == null) return "Price on request";
  return property.price >= 10000000 ? `₹ ${(property.price / 10000000).toFixed(2)} Cr` : `₹ ${(property.price / 100000).toFixed(2)} Lakh`;
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!supabase) return;
    setError("");
    const userResult = await supabase.auth.getUser();
    if (!userResult.data.user) { setError("Please sign in to access the review workspace."); setLoading(false); return; }
    const currentUser = userResult.data.user;
    setUserId(currentUser.id);

    const profile = await supabase.from("profiles").select("role").eq("id", currentUser.id).maybeSingle();
    if (profile.error || !profile.data || !["admin", "reviewer"].includes(profile.data.role)) {
      setUserRole(profile.data?.role || "");
      setError("You do not have permission to access the property review workspace.");
      setLoading(false);
      return;
    }
    setUserRole(profile.data.role);

    const reviewQuery = supabase.from("property_reviews").select("id,property_id,assigned_to,decision,notes").eq("decision", "pending");
    const reviewResult = profile.data.role === "reviewer" ? await reviewQuery.eq("assigned_to", currentUser.id) : await reviewQuery;
    if (reviewResult.error) { setError(reviewResult.error.message); setLoading(false); return; }
    const loadedReviews = (reviewResult.data || []) as Review[];
    setReviews(loadedReviews);

    const propertyIds = loadedReviews.map((review) => review.property_id);
    if (profile.data.role === "reviewer" && propertyIds.length === 0) {
      setProperties([]);
    } else {
      let propertyQuery = supabase.from("properties").select("id,title,city,locality,price,purpose,status,created_at").eq("status", "pending_review").order("created_at", { ascending: true });
      if (profile.data.role === "reviewer") propertyQuery = propertyQuery.in("id", propertyIds);
      const propertyResult = await propertyQuery;
      if (propertyResult.error) { setError(propertyResult.error.message); setLoading(false); return; }
      setProperties((propertyResult.data || []) as Property[]);
    }

    if (profile.data.role === "admin") {
      const reviewerResult = await supabase.from("profiles").select("id,full_name,role").in("role", ["reviewer", "admin"]);
      if (!reviewerResult.error) setReviewers((reviewerResult.data || []) as Reviewer[]);
    } else {
      setReviewers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reviewFor = (propertyId: string) => reviews.find((review) => review.property_id === propertyId);

  const assign = async (reviewId: string, reviewerId: string) => {
    if (!supabase || userRole !== "admin") return;
    setSaving(reviewId); setError("");
    const result = await supabase.from("property_reviews").update({ assigned_to: reviewerId || null }).eq("id", reviewId);
    if (result.error) setError(result.error.message);
    await load(); setSaving("");
  };

  const decide = async (propertyId: string, decision: "approved" | "rejected", notes: string) => {
    if (!supabase) return;
    const review = reviewFor(propertyId);
    if (!review || (userRole === "reviewer" && review.assigned_to !== userId)) return;
    setSaving(propertyId); setError("");
    const user = await supabase.auth.getUser();
    if (!user.data.user) { setError("Your session has expired."); setSaving(""); return; }

    const reviewResult = await supabase.from("property_reviews").update({ decision, notes: notes.trim() || null, reviewed_by: user.data.user.id, reviewed_at: new Date().toISOString() }).eq("id", review.id);
    if (reviewResult.error) { setError(reviewResult.error.message); setSaving(""); return; }

    const propertyResult = await supabase.from("properties").update({ status: decision === "approved" ? "published" : "rejected" }).eq("id", propertyId);
    if (propertyResult.error) setError(propertyResult.error.message);
    await load(); setSaving("");
  };

  if (loading) return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader /><div className="container py-24 text-center text-sm text-[#687987]">Loading review workspace…</div><SiteFooter /></main>;

  return <main className="min-h-screen bg-[#f7fafb] text-[#102638]"><SiteHeader /><section className="container max-w-6xl py-10 lg:py-14"><div className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">UNLIVO Admin</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1.5px]">Property Review</h1><p className="mt-3 text-sm leading-6 text-[#687987]">Review submitted listings before they become visible on the marketplace. You are signed in as <span className="font-bold">{userRole}</span>.</p></div>{error&&<div className="mt-7 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}<div className="mt-8 space-y-5">{properties.length===0?<div className="rounded-3xl border border-[#dfe9ed] bg-white p-10 text-center shadow-sm"><CheckCircle2 className="mx-auto text-[#0bb89b]" size={34}/><h2 className="mt-4 text-xl font-extrabold">No properties waiting for review</h2><p className="mt-2 text-sm text-[#687987]">New submissions will appear here automatically.</p></div>:properties.map((property)=>{const review=reviewFor(property.id);return <ReviewCard key={property.id} property={property} review={review} reviewers={reviewers} userRole={userRole} userId={userId} saving={saving} onAssign={assign} onDecide={decide}/>})}</div></section><SiteFooter/></main>;
}

function ReviewCard({property,review,reviewers,userRole,userId,saving,onAssign,onDecide}:{property:Property;review?:Review;reviewers:Reviewer[];userRole:string;userId:string;saving:string;onAssign:(reviewId:string,reviewerId:string)=>void;onDecide:(propertyId:string,decision:"approved"|"rejected",notes:string)=>void}){
 const [notes,setNotes]=useState(review?.notes||"");
 if(!review)return null;
 const assignedName=reviewers.find((reviewer)=>reviewer.id===review.assigned_to)?.full_name||"Unassigned";
 const canReview=userRole==="admin"||review.assigned_to===userId;
 return <article className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#fff8e7] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#8a691f]">Pending review</span><span className="text-xs text-[#7b8c97]">{new Date(property.created_at).toLocaleString("en-IN")}</span></div><h2 className="mt-3 text-2xl font-extrabold">{property.title}</h2><p className="mt-1 text-sm text-[#687987]">{[property.locality,property.city].filter(Boolean).join(", ")} · {price(property)}</p></div><a href={`/properties/${property.id}`} className="inline-flex cursor-pointer rounded-xl border border-[#cbdde3] bg-white px-4 py-2.5 text-sm font-bold text-[#123b53]">Preview listing</a></div><div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]"><div className="rounded-2xl bg-[#f7fafb] p-5"><div className="flex items-center gap-2"><UserRound size={18} className="text-[#0b8f79]"/><p className="text-sm font-extrabold">Reviewer</p></div>{userRole==="admin"?<select value={review.assigned_to||""} onChange={(event)=>onAssign(review.id,event.target.value)} disabled={saving===review.id} className="mt-4 w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm"><option value="">Unassigned</option>{reviewers.map((reviewer)=><option key={reviewer.id} value={reviewer.id}>{reviewer.full_name||"Unnamed reviewer"} · {reviewer.role}</option>)}</select>:<p className="mt-3 text-sm text-[#687987]">Assigned to you.</p>}</div><div className="rounded-2xl bg-[#f7fafb] p-5"><div className="flex items-center gap-2"><Clock3 size={18} className="text-[#0b8f79]"/><p className="text-sm font-extrabold">Review checklist</p></div><p className="mt-3 text-sm leading-6 text-[#687987]">Check property details, location, photos, pricing and basic listing quality before approving.</p></div></div><div className="mt-5"><label className="mb-2 block text-xs font-bold uppercase tracking-[1.3px] text-[#547083]">Reviewer note</label><textarea value={notes} onChange={(event)=>setNotes(event.target.value)} className="min-h-28 w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#0bb89b]" placeholder="Optional note for the property owner…"/></div><div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={saving===property.id||!canReview} onClick={()=>onDecide(property.id,"rejected",notes)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e5caca] bg-white px-5 py-3 text-sm font-bold text-[#9b4d4d] disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={17}/> Reject</button><button disabled={saving===property.id||!canReview} onClick={()=>onDecide(property.id,"approved",notes)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0bb89b] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={17}/> Approve & Publish</button></div></article>;
}

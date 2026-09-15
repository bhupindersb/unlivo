"use client";

import { useEffect, useMemo, useState } from "react";
import { Bath, BedDouble, Car, CheckCircle2, ChevronLeft, ChevronRight, Eye, Search, UserRound, X, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Property = { id:string; title:string; city:string; locality:string; price:number|null; purpose:string; status:string; created_at:string };
type Review = { id:string; property_id:string; assigned_to:string|null; decision:string; notes:string|null; reviewed_by:string|null };
type Reviewer = { id:string; full_name:string|null; email:string|null; role:string; access_status:string };
type PreviewProperty = { id:string; title:string; description:string|null; city:string; locality:string; pincode:string|null; address_line:string|null; price:number|null; rent_monthly:number|null; bedrooms:number|null; bathrooms:number|null; area_sqft:number|null; plot_area_sqyd:number|null; property_type:string|null; category:string; purpose:string; furnishing:string|null; possession:string|null; parking_spaces:number|null; latitude:number|null; longitude:number|null; status:string };
type PreviewMedia = { id:string; url:string; is_cover:boolean; sort_order:number };
type Filter = "all" | "pending_review" | "published" | "rejected" | "other";

type ReviewerStats = { total:number; pending:number; reviewed:number; rejected:number };

function price(p:Property|PreviewProperty){
  if(p.purpose==="rent"){
    const rent="rent_monthly" in p?p.rent_monthly:null;
    return rent==null?"Rent on request":`₹ ${rent.toLocaleString("en-IN")}/month`;
  }
  if(p.price==null)return "Price on request";
  return p.price>=10000000?`₹ ${(p.price/10000000).toFixed(2)} Cr`:`₹ ${(p.price/100000).toFixed(2)} Lakh`;
}
function label(v:string|null){return v?v.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase()):"—"}
function statusLabel(status:string){return status==="pending_review"?"Pending Review":label(status)}
function statusClass(status:string){
  if(status==="published")return "bg-[#e9faf4] text-[#087f73]";
  if(status==="pending_review")return "bg-[#fff8e7] text-[#8a691f]";
  if(status==="rejected")return "bg-[#fff1f1] text-[#9b4d4d]";
  if(["sold","rented","under_offer"].includes(status))return "bg-[#eef4ff] text-[#315b9b]";
  return "bg-[#f1f5f7] text-[#60737e]";
}

export default function AdminPropertiesPage(){
  const[properties,setProperties]=useState<Property[]>([]);
  const[reviews,setReviews]=useState<Review[]>([]);
  const[reviewers,setReviewers]=useState<Reviewer[]>([]);
  const[reviewerStats,setReviewerStats]=useState<Record<string,ReviewerStats>>({});
  const[userRole,setUserRole]=useState("");
  const[currentUserId,setCurrentUserId]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState("");
  const[error,setError]=useState("");
  const[filter,setFilter]=useState<Filter>("all");
  const[search,setSearch]=useState("");
  const[assignPropertyId,setAssignPropertyId]=useState<string|null>(null);
  const[selectedReviewerId,setSelectedReviewerId]=useState<string|null>(null);
  const[previewId,setPreviewId]=useState<string|null>(null);
  const[previewProperty,setPreviewProperty]=useState<PreviewProperty|null>(null);
  const[previewMedia,setPreviewMedia]=useState<PreviewMedia[]>([]);
  const[previewActive,setPreviewActive]=useState(0);
  const[previewLoading,setPreviewLoading]=useState(false);
  const[previewError,setPreviewError]=useState("");

  const load=async()=>{
    if(!supabase)return;
    setError("");
    const u=await supabase.auth.getUser();
    if(!u.data.user){setError("Please sign in to access the property workspace.");setLoading(false);return}
    setCurrentUserId(u.data.user.id);
    const profile=await supabase.from("profiles").select("role,access_status").eq("id",u.data.user.id).maybeSingle();
    if(profile.error||!profile.data||!["admin","reviewer"].includes(profile.data.role)||(profile.data.role==="reviewer"&&profile.data.access_status==="revoked")){
      setUserRole(profile.data?.role||"");setError("You do not have permission to access the property workspace.");setLoading(false);return;
    }
    setUserRole(profile.data.role);

    const pr=await supabase.from("properties").select("id,title,city,locality,price,purpose,status,created_at").order("created_at",{ascending:false});
    if(pr.error){setError(pr.error.message);setLoading(false);return}
    setProperties((pr.data||[]) as Property[]);

    const rr=await supabase.from("property_reviews").select("id,property_id,assigned_to,decision,notes,reviewed_by");
    if(!rr.error)setReviews((rr.data||[]) as Review[]);

    if(profile.data.role==="admin"){
      const r=await supabase.from("profiles").select("id,full_name,email,role,access_status").eq("role","reviewer").eq("access_status","active").order("full_name");
      if(!r.error){
        const activeReviewers=(r.data||[]) as Reviewer[];
        setReviewers(activeReviewers);
        const stats:Record<string,ReviewerStats>={};
        for(const reviewer of activeReviewers)stats[reviewer.id]={total:0,pending:0,reviewed:0,rejected:0};
        for(const review of (rr.data||[]) as Review[]){
          if(!review.assigned_to||!stats[review.assigned_to])continue;
          stats[review.assigned_to].total++;
          if(review.decision==="pending")stats[review.assigned_to].pending++;
          else if(review.decision==="rejected")stats[review.assigned_to].rejected++;
          else if(review.decision==="approved")stats[review.assigned_to].reviewed++;
        }
        setReviewerStats(stats);
      }
    }
    setLoading(false);
  };

  useEffect(()=>{load()},[]);

  const reviewFor=(id:string)=>reviews.find(r=>r.property_id===id);
  const counts=useMemo(()=>({
    all:properties.length,
    pending_review:properties.filter(p=>p.status==="pending_review").length,
    published:properties.filter(p=>p.status==="published").length,
    rejected:properties.filter(p=>p.status==="rejected").length,
    other:properties.filter(p=>!["pending_review","published","rejected"].includes(p.status)).length
  }),[properties]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return properties.filter(p=>{
      const matchesFilter=filter==="all"||(filter==="other"?!["pending_review","published","rejected"].includes(p.status):p.status===filter);
      const hay=[p.title,p.city,p.locality,p.status].filter(Boolean).join(" ").toLowerCase();
      return matchesFilter&&(!q||hay.includes(q));
    });
  },[properties,filter,search]);

  const openAssign=(propertyId:string)=>{
    const review=reviewFor(propertyId);
    if(!review)return;
    setAssignPropertyId(propertyId);
    setSelectedReviewerId(review.assigned_to);
    setError("");
  };

  const assign=async()=>{
    if(!supabase||userRole!=="admin"||!assignPropertyId||!selectedReviewerId)return;
    const review=reviewFor(assignPropertyId);
    if(!review)return;
    setSaving(`assign-${review.id}`);setError("");
    const r=await supabase.from("property_reviews").update({assigned_to:selectedReviewerId}).eq("id",review.id);
    if(r.error){setError(r.error.message);setSaving("");return}
    setAssignPropertyId(null);setSelectedReviewerId(null);
    await load();
    setSaving("");
  };

  const decide=async(propertyId:string,decision:"approved"|"rejected",notes:string)=>{
    if(!supabase)return;
    const review=reviewFor(propertyId);if(!review)return;
    const allowed=userRole==="admin"||review.assigned_to===currentUserId;
    if(!allowed){setError("This listing is assigned to another reviewer.");return}
    setSaving(propertyId);setError("");
    const u=await supabase.auth.getUser();
    if(!u.data.user){setError("Your session has expired.");setSaving("");return}
    const r=await supabase.from("property_reviews").update({decision,notes:notes.trim()||null,reviewed_by:u.data.user.id,reviewed_at:new Date().toISOString()}).eq("id",review.id);
    if(r.error){setError(r.error.message);setSaving("");return}
    const p=await supabase.from("properties").update({status:decision==="approved"?"published":"rejected"}).eq("id",propertyId);
    if(p.error)setError(p.error.message);
    setPreviewId(null);setPreviewProperty(null);await load();setSaving("");
  };

  const openPreview=async(propertyId:string)=>{
    if(!supabase)return;
    setPreviewId(propertyId);setPreviewProperty(null);setPreviewMedia([]);setPreviewActive(0);setPreviewError("");setPreviewLoading(true);
    const r=await supabase.from("properties").select("id,title,description,city,locality,pincode,address_line,price,rent_monthly,bedrooms,bathrooms,area_sqft,plot_area_sqyd,property_type,category,purpose,furnishing,possession,parking_spaces,latitude,longitude,status").eq("id",propertyId).maybeSingle();
    if(r.error||!r.data){setPreviewError(r.error?.message||"This property could not be loaded.");setPreviewLoading(false);return}
    setPreviewProperty(r.data as PreviewProperty);
    const m=await supabase.from("property_media").select("id,storage_path,sort_order,is_cover").eq("property_id",propertyId).order("sort_order",{ascending:true});
    if(m.error)setPreviewError(m.error.message);
    else{
      const urls=(m.data||[]).map((x:any)=>({...x,url:supabase!.storage.from("property-media").getPublicUrl(x.storage_path).data.publicUrl})).sort((a:any,b:any)=>(a.is_cover?0:1)-(b.is_cover?0:1)||a.sort_order-b.sort_order);
      setPreviewMedia(urls);
    }
    setPreviewLoading(false);
  };

  if(loading)return <section className="px-5 py-24 text-center text-sm text-[#687987]">Loading property workspace…</section>;

  const filterTabs:[Filter,string,number][]=[
    ["all","All Properties",counts.all],
    ["pending_review","Pending Reviews",counts.pending_review],
    ["published","Published",counts.published],
    ["rejected","Rejected",counts.rejected],
    ["other","Other",counts.other],
  ];

  const assignProperty=properties.find(p=>p.id===assignPropertyId);
  const assignReview=assignPropertyId?reviewFor(assignPropertyId):undefined;
  const selectedReviewer=reviewers.find(r=>r.id===selectedReviewerId);

  return <section className="px-5 py-8 lg:px-9 lg:py-10">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Admin</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1.5px]">Properties</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#687987]">Manage submitted listings, monitor their status, assign reviewers and preview properties before publication.</p></div>
      {userRole==="admin"&&<a href="/admin/reviewers" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#cbdde3] bg-white px-5 py-3 text-sm font-bold text-[#123b53] shadow-sm hover:border-[#0bb89b] hover:text-[#087f73]">Manage Reviewers</a>}
    </div>
    {error&&<div className="mt-7 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}

    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {filterTabs.map(([key,title,count])=><button key={key} type="button" onClick={()=>setFilter(key)} className={`group rounded-2xl border p-4 text-left transition ${filter===key?"border-[#0bb89b] bg-[#f0fbf8] shadow-sm":"border-[#dfe9ed] bg-white hover:border-[#b9d8d5]"}`}>
        <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[1.1px] ${key==="pending_review"?"bg-[#fff8e7] text-[#8a691f]":key==="published"?"bg-[#e9faf4] text-[#087f73]":key==="rejected"?"bg-[#fff1f1] text-[#9b4d4d]":"bg-[#f1f5f7] text-[#60737e]"}`}>{title}</span><span className="text-2xl font-extrabold text-[#123b53]">{count}</span></div>
      </button>)}
    </div>

    <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#e6edef] p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div><p className="text-xs font-bold uppercase tracking-[1.4px] text-[#547083]">Property inventory</p><h2 className="mt-1 text-2xl font-extrabold">{filterTabs.find(x=>x[0]===filter)?.[1]}</h2></div>
        <div className="relative w-full lg:max-w-sm"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81929b]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search properties…" className="w-full rounded-xl border border-[#d7e3e8] bg-[#fbfdfd] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0bb89b]"/></div>
      </div>
      {visible.length===0?<div className="p-12 text-center"><CheckCircle2 className="mx-auto text-[#0bb89b]" size={34}/><h3 className="mt-4 text-xl font-extrabold">No properties found</h3><p className="mt-2 text-sm text-[#687987]">Try another status filter or search term.</p></div>:<div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead><tr className="border-b border-[#e6edef] bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-[1.25px] text-[#71838e]"><th className="px-6 py-4">Property</th><th className="px-5 py-4">Date &amp; Time</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Reviewer</th><th className="px-5 py-4 text-right">Preview</th></tr></thead>
          <tbody className="divide-y divide-[#edf1f3]">{visible.map(property=>{
            const review=reviewFor(property.id);
            const assigned=reviewers.find(r=>r.id===review?.assigned_to);
            const stats=assigned?reviewerStats[assigned.id]:undefined;
            const canReview=userRole==="admin"||review?.assigned_to===currentUserId;
            return <tr key={property.id} className="group hover:bg-[#fbfdfd]">
              <td className="px-6 py-5"><div className="max-w-[300px]"><p className="truncate text-sm font-extrabold text-[#123b53]" title={property.title}>{property.title}</p><p className="mt-1 truncate text-xs text-[#7a8b95]">{[property.locality,property.city].filter(Boolean).join(", ")||"Location not specified"}</p></div></td>
              <td className="whitespace-nowrap px-5 py-5 text-sm text-[#5f737f]">{new Date(property.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}<span className="mt-0.5 block text-xs text-[#8a9aa3]">{new Date(property.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></td>
              <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-[#123b53]">{price(property)}</td>
              <td className="px-5 py-5"><span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusClass(property.status)}`}>{statusLabel(property.status)}</span></td>
              <td className="px-5 py-5">{property.status==="pending_review"&&review?(userRole==="admin"?<div className="min-w-[230px]">
                {assigned?<div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#123b53]">{assigned.full_name||"Unnamed reviewer"}</p><p className="truncate text-[11px] text-[#81929b]">{assigned.email||"No email"}</p>{stats&&<p className="mt-1 text-[10px] font-bold text-[#087f73]">{stats.pending} pending · {stats.reviewed} reviewed · {stats.rejected} rejected</p>}</div><button type="button" onClick={()=>openAssign(property.id)} className="shrink-0 rounded-lg border border-[#cbdde3] bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#315b6e] hover:border-[#0bb89b] hover:text-[#087f73]">Change</button></div>:<button type="button" onClick={()=>openAssign(property.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#b9d8d5] bg-[#f0fbf8] px-3.5 py-2.5 text-xs font-extrabold text-[#087f73] hover:border-[#0bb89b]"><UserRound size={14}/>Assign Reviewer</button>}
              </div>:<div className="text-sm">{assigned?<><p className="font-bold text-[#123b53]">{assigned.full_name||"Reviewer"}</p><p className="text-xs text-[#81929b]">Assigned to you</p></>:<span className="text-[#9aa8af]">Not assigned</span>}</div>):<span className="text-xs text-[#9aa8af]">—</span>}</td>
              <td className="px-5 py-5 text-right"><button type="button" onClick={()=>openPreview(property.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#d4e1e6] bg-white px-3.5 py-2 text-xs font-bold text-[#315b6e] hover:border-[#0bb89b] hover:text-[#087f73]"><Eye size={14}/>Preview</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </div>

    {assignPropertyId&&userRole==="admin"&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b2635]/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#e5edef] px-6 py-5">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#087f73]">Reviewer Assignment</p><h2 className="mt-1 text-2xl font-extrabold text-[#123b53]">Assign Reviewer</h2><p className="mt-1 max-w-xl text-sm text-[#687987]">Select a reviewer for <span className="font-bold text-[#315b6e]">{assignProperty?.title}</span>. Nothing is assigned until you click the button below.</p></div>
          <button type="button" onClick={()=>{setAssignPropertyId(null);setSelectedReviewerId(null)}} className="rounded-xl p-2 text-[#71838e] hover:bg-[#f1f5f7] hover:text-[#123b53]"><X size={20}/></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-5 sm:p-6">
          {reviewers.length===0?<div className="rounded-2xl border border-[#e0eaee] bg-[#f8fafb] p-8 text-center"><UserRound className="mx-auto text-[#8a9aa3]" size={32}/><p className="mt-3 font-bold text-[#315b6e]">No active reviewers available</p><p className="mt-1 text-sm text-[#7b8d97]">Add an active reviewer before assigning this property.</p></div>:<div className="space-y-3">{reviewers.map(reviewer=>{
            const stats=reviewerStats[reviewer.id]||{total:0,pending:0,reviewed:0,rejected:0};
            const selected=selectedReviewerId===reviewer.id;
            return <button key={reviewer.id} type="button" onClick={()=>setSelectedReviewerId(reviewer.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?"border-[#0bb89b] bg-[#f0fbf8] shadow-sm":"border-[#dfe9ed] bg-white hover:border-[#b9d8d5]"}`}>
              <div className="flex items-start gap-4"><div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected?"bg-[#0bb89b] text-white":"bg-[#eaf1f4] text-[#315b6e]"}`}><UserRound size={19}/></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-[#123b53]">{reviewer.full_name||"Unnamed reviewer"}</p><p className="truncate text-xs text-[#71838e]">{reviewer.email||"No email"}</p></div><span className={`mt-1 h-5 w-5 rounded-full border-2 sm:mt-0 ${selected?"border-[#0bb89b] bg-[#0bb89b]":"border-[#b9cbd2] bg-white"}`}>{selected&&<span className="mx-auto mt-[3px] block h-2 w-2 rounded-full bg-white"/>}</span></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#f1f5f7] px-2.5 py-1 text-[10px] font-bold text-[#5f737f]"><strong>{stats.total}</strong> Assigned</span><span className="rounded-full bg-[#fff8e7] px-2.5 py-1 text-[10px] font-bold text-[#8a691f]"><strong>{stats.pending}</strong> Pending</span><span className="rounded-full bg-[#e9faf4] px-2.5 py-1 text-[10px] font-bold text-[#087f73]"><strong>{stats.reviewed}</strong> Reviewed</span><span className="rounded-full bg-[#fff1f1] px-2.5 py-1 text-[10px] font-bold text-[#9b4d4d]"><strong>{stats.rejected}</strong> Rejected</span></div></div></div>
            </button>;
          })}</div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-[#e5edef] bg-[#fbfdfd] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={()=>{setAssignPropertyId(null);setSelectedReviewerId(null)}} className="rounded-xl border border-[#cbdde3] bg-white px-5 py-2.5 text-sm font-bold text-[#315b6e] hover:border-[#9ebcc5]">Cancel</button>
          <button type="button" onClick={assign} disabled={!selectedReviewerId||saving.startsWith("assign-")} className="rounded-xl bg-[#087f73] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#066c63] disabled:cursor-not-allowed disabled:opacity-50">{saving.startsWith("assign-")?"Assigning…":assignReview?.assigned_to?"Update Assignment":"Assign Reviewer"}</button>
        </div>
      </div>
    </div>}

    {previewId&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b2635]/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5edef] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#087f73]">Property Preview</p><h2 className="mt-1 text-xl font-extrabold text-[#123b53]">{previewProperty?.title||"Loading property…"}</h2></div><button type="button" onClick={()=>{setPreviewId(null);setPreviewProperty(null)}} className="rounded-xl p-2 text-[#71838e] hover:bg-[#f1f5f7]"><X size={20}/></button></div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
          {previewLoading?<div className="py-20 text-center text-sm text-[#687987]">Loading property preview…</div>:previewError?<div className="rounded-xl bg-[#fff7f7] p-5 text-sm font-semibold text-[#8b4b4b]">{previewError}</div>:previewProperty&&<div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div><div className="relative overflow-hidden rounded-2xl bg-[#eef3f5] aspect-[4/3]">{previewMedia.length?<img src={previewMedia[previewActive]?.url} alt={previewProperty.title} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-sm text-[#81929b]">No property photos</div>}{previewMedia.length>1&&<><button type="button" onClick={()=>setPreviewActive(i=>(i-1+previewMedia.length)%previewMedia.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronLeft size={18}/></button><button type="button" onClick={()=>setPreviewActive(i=>(i+1)%previewMedia.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronRight size={18}/></button></>}</div>{previewMedia.length>1&&<div className="mt-3 flex gap-2 overflow-x-auto">{previewMedia.map((m,i)=><button key={m.id} type="button" onClick={()=>setPreviewActive(i)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i===previewActive?"border-[#0bb89b]":"border-transparent"}`}><img src={m.url} alt="" className="h-full w-full object-cover"/></button>)}</div>}</div>
            <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusClass(previewProperty.status)}`}>{statusLabel(previewProperty.status)}</span><span className="text-2xl font-extrabold text-[#123b53]">{price(previewProperty)}</span></div><p className="mt-3 text-sm text-[#687987]">{[previewProperty.locality,previewProperty.city,previewProperty.pincode].filter(Boolean).join(", ")}</p>{previewProperty.description&&<p className="mt-5 whitespace-pre-line text-sm leading-6 text-[#536a77]">{previewProperty.description}</p>}<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Type",previewProperty.property_type],["Bedrooms",previewProperty.bedrooms],["Bathrooms",previewProperty.bathrooms],["Area",previewProperty.area_sqft?`${previewProperty.area_sqft} sq ft`:null],["Furnishing",previewProperty.furnishing],["Possession",previewProperty.possession],["Parking",previewProperty.parking_spaces],["Purpose",previewProperty.purpose]].map(([k,v])=><div key={k} className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-[1px] text-[#81929b]">{k}</p><p className="mt-1 text-sm font-bold text-[#315b6e]">{v??"—"}</p></div>)}</div>{previewProperty.status==="pending_review"&&<div className="mt-6 flex flex-col gap-3 border-t border-[#e5edef] pt-5"><p className="text-sm font-bold text-[#315b6e]">Review this property</p><textarea id="admin-review-notes" placeholder="Optional reviewer notes…" className="min-h-[90px] w-full rounded-xl border border-[#d7e3e8] px-3 py-2.5 text-sm outline-none focus:border-[#0bb89b]"/><div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>decide(previewProperty.id,"rejected",(document.getElementById("admin-review-notes") as HTMLTextAreaElement)?.value||"")} disabled={!!saving} className="inline-flex items-center gap-2 rounded-xl border border-[#e8caca] bg-[#fff7f7] px-4 py-2.5 text-sm font-extrabold text-[#9b4d4d] disabled:opacity-50"><XCircle size={16}/>Reject</button><button type="button" onClick={()=>decide(previewProperty.id,"approved",(document.getElementById("admin-review-notes") as HTMLTextAreaElement)?.value||"")} disabled={!!saving} className="inline-flex items-center gap-2 rounded-xl bg-[#087f73] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"><CheckCircle2 size={16}/>Approve &amp; Publish</button></div></div>}</div>
          </div>}
        </div>
      </div>
    </div>}
  </section>;
}

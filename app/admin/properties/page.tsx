"use client";

import { useEffect, useMemo, useState } from "react";
import { Bath, BedDouble, Car, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Maximize, Search, UserRound, X, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Property = { id:string; title:string; city:string; locality:string; price:number|null; purpose:string; status:string; created_at:string };
type Review = { id:string; property_id:string; assigned_to:string|null; decision:string; notes:string|null };
type Reviewer = { id:string; full_name:string|null; email:string|null; role:string; access_status:string };
type PreviewProperty = { id:string; title:string; description:string|null; city:string; locality:string; pincode:string|null; address_line:string|null; price:number|null; rent_monthly:number|null; bedrooms:number|null; bathrooms:number|null; area_sqft:number|null; plot_area_sqyd:number|null; property_type:string|null; category:string; purpose:string; furnishing:string|null; possession:string|null; parking_spaces:number|null; latitude:number|null; longitude:number|null; status:string };
type PreviewMedia = { id:string; url:string; is_cover:boolean; sort_order:number };
type Filter = "all" | "pending_review" | "published" | "rejected" | "other";

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
  const[userRole,setUserRole]=useState("");
  const[currentUserId,setCurrentUserId]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState("");
  const[error,setError]=useState("");
  const[filter,setFilter]=useState<Filter>("all");
  const[search,setSearch]=useState("");
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
    const rr=await supabase.from("property_reviews").select("id,property_id,assigned_to,decision,notes").eq("decision","pending");
    if(!rr.error)setReviews((rr.data||[]) as Review[]);
    if(profile.data.role==="admin"){
      const r=await supabase.from("profiles").select("id,full_name,email,role,access_status").eq("role","reviewer").order("full_name");
      if(!r.error)setReviewers((r.data||[]) as Reviewer[]);
    }
    setLoading(false);
  };

  useEffect(()=>{load()},[]);
  const reviewFor=(id:string)=>reviews.find(r=>r.property_id===id);
  const counts=useMemo(()=>({all:properties.length,pending_review:properties.filter(p=>p.status==="pending_review").length,published:properties.filter(p=>p.status==="published").length,rejected:properties.filter(p=>p.status==="rejected").length,other:properties.filter(p=>!["pending_review","published","rejected"].includes(p.status)).length}),[properties]);
  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return properties.filter(p=>{
      const matchesFilter=filter==="all"||(filter==="other"?!["pending_review","published","rejected"].includes(p.status):p.status===filter);
      const hay=[p.title,p.city,p.locality,p.status].filter(Boolean).join(" ").toLowerCase();
      return matchesFilter&&(!q||hay.includes(q));
    });
  },[properties,filter,search]);

  const assign=async(reviewId:string,reviewerId:string)=>{
    if(!supabase||userRole!=="admin")return;
    setSaving(reviewId);setError("");
    const r=await supabase.from("property_reviews").update({assigned_to:reviewerId||null}).eq("id",reviewId);
    if(r.error)setError(r.error.message);
    await load();setSaving("");
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
        <table className="w-full min-w-[980px] text-left">
          <thead><tr className="border-b border-[#e6edef] bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-[1.25px] text-[#71838e]"><th className="px-6 py-4">Property</th><th className="px-5 py-4">Date &amp; Time</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Assign Reviewer</th><th className="px-5 py-4 text-right">Preview</th></tr></thead>
          <tbody className="divide-y divide-[#edf1f3]">{visible.map(property=>{const review=reviewFor(property.id);const assigned=reviewers.find(r=>r.id===review?.assigned_to);const canReview=userRole==="admin"||review?.assigned_to===currentUserId;return <tr key={property.id} className="group hover:bg-[#fbfdfd]">
            <td className="px-6 py-5"><div className="max-w-[310px]"><p className="truncate text-sm font-extrabold text-[#123b53]" title={property.title}>{property.title}</p><p className="mt-1 truncate text-xs text-[#7a8b95]">{[property.locality,property.city].filter(Boolean).join(", ")||"Location not specified"}</p></div></td>
            <td className="whitespace-nowrap px-5 py-5 text-sm text-[#5f737f]">{new Date(property.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}<span className="mt-0.5 block text-xs text-[#8a9aa3]">{new Date(property.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></td>
            <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-[#123b53]">{price(property)}</td>
            <td className="px-5 py-5"><span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusClass(property.status)}`}>{statusLabel(property.status)}</span></td>
            <td className="px-5 py-5">{property.status==="pending_review"&&review?(userRole==="admin"?<select value={review.assigned_to||""} onChange={e=>assign(review.id,e.target.value)} disabled={saving===review.id} className="w-[225px] rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-xs font-semibold text-[#315064] outline-none focus:border-[#0bb89b]"><option value="">Unassigned</option>{reviewers.filter(r=>r.access_status==="active").map(r=><option key={r.id} value={r.id}>{r.full_name||"Unnamed reviewer"}{r.email?` · ${r.email}`:""}</option>)}</select>:<span className="text-xs text-[#687987]">{review.assigned_to?(assigned?.full_name||"Assigned reviewer"):"Awaiting assignment"}</span>):<span className="text-xs text-[#a0adb4]">—</span>}</td>
            <td className="px-5 py-5 text-right"><button type="button" onClick={()=>openPreview(property.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] bg-white px-3.5 py-2 text-xs font-extrabold text-[#123b53] hover:border-[#0bb89b] hover:text-[#087f73]"><Eye size={15}/>Preview</button>{property.status==="pending_review"&&!canReview&&userRole!=="admin"&&<span className="sr-only">Assigned to another reviewer</span>}</td>
          </tr>})}</tbody>
        </table>
      </div>}
      <div className="flex flex-col gap-2 border-t border-[#e6edef] px-6 py-4 text-xs text-[#7b8c97] sm:flex-row sm:items-center sm:justify-between"><span>Showing {visible.length} of {properties.length} properties</span><span>Table view is ready for search, filters and pagination as inventory grows.</span></div>
    </div>
    {previewId&&<PreviewModal property={previewProperty} media={previewMedia} active={previewActive} setActive={setPreviewActive} loading={previewLoading} error={previewError} review={reviewFor(previewId)} userRole={userRole} currentUserId={currentUserId} saving={saving===previewId} onClose={()=>{setPreviewId(null);setPreviewProperty(null)}} onDecide={decide}/>} 
  </section>;
}

function PreviewModal({property,media,active,setActive,loading,error,review,userRole,currentUserId,saving,onClose,onDecide}:{property:PreviewProperty|null;media:PreviewMedia[];active:number;setActive:(n:number)=>void;loading:boolean;error:string;review:Review|undefined;userRole:string;currentUserId:string;saving:boolean;onClose:()=>void;onDecide:(id:string,decision:"approved"|"rejected",notes:string)=>void}){
  const[notes,setNotes]=useState(review?.notes||"");
  useEffect(()=>{setNotes(review?.notes||"")},[review?.id]);
  if(!property&&!loading)return null;
  const canReview=!!property&&!!review&&(userRole==="admin"||review.assigned_to===currentUserId);
  const current=media[active];
  const facts=[
    property?.bedrooms!=null?{icon:<BedDouble size={18}/>,value:property.bedrooms,label:"Bedrooms"}:null,
    property?.bathrooms!=null?{icon:<Bath size={18}/>,value:property.bathrooms,label:"Bathrooms"}:null,
    property?.area_sqft!=null?{icon:<Maximize size={18}/>,value:`${property.area_sqft.toLocaleString("en-IN")} sq ft`,label:"Built-up area"}:null,
    property?.parking_spaces!=null?{icon:<Car size={18}/>,value:property.parking_spaces,label:"Parking"}:null,
  ].filter(Boolean) as {icon:React.ReactNode;value:string|number;label:string}[];
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102638]/70 p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Property preview">
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-[#e3eaed] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#087f73]">UNLIVO Property Preview</p><h2 className="mt-1 text-lg font-extrabold text-[#123b53] sm:text-xl">{property?.title||"Loading property…"}</h2></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e3e8] p-2 text-[#547083] hover:border-[#0bb89b] hover:text-[#087f73]" aria-label="Close preview"><X size={20}/></button></div>
      {loading?<div className="flex min-h-[420px] items-center justify-center text-sm text-[#687987]">Loading property preview…</div>:error?<div className="p-8 text-center"><p className="font-bold text-[#9b4d4d]">Unable to load preview</p><p className="mt-2 text-sm text-[#687987]">{error}</p></div>:property?<>
        <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_.9fr] lg:p-7">
          <div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#e9faf6]">{current?<img src={current.url} alt={property.title} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-center text-sm text-[#71838e]"><div><Eye size={34} className="mx-auto text-[#0bb89b]"/><p className="mt-3">No property photos uploaded yet.</p></div></div>}{media.length>1&&<><button type="button" onClick={()=>setActive(active===0?media.length-1:active-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md" aria-label="Previous photo"><ChevronLeft size={20}/></button><button type="button" onClick={()=>setActive(active===media.length-1?0:active+1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md" aria-label="Next photo"><ChevronRight size={20}/></button></>}</div>
            {media.length>1&&<div className="mt-3 flex gap-2 overflow-x-auto">{media.map((m,i)=><button key={m.id} type="button" onClick={()=>setActive(i)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i===active?"border-[#0bb89b]":"border-transparent"}`}><img src={m.url} alt="" className="h-full w-full object-cover"/></button>)}</div>}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] ${statusClass(property.status)}`}>{statusLabel(property.status)}</span><span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">{label(property.purpose)}</span></div>
            <h3 className="mt-4 text-2xl font-extrabold text-[#123b53]">{property.title}</h3><p className="mt-2 text-sm text-[#687987]">{[property.locality,property.city,property.pincode].filter(Boolean).join(", ")}</p><p className="mt-4 text-2xl font-extrabold text-[#087f73]">{price(property)}</p>
            {facts.length>0&&<div className="mt-6 grid grid-cols-2 gap-3">{facts.map((f,i)=><div key={i} className="rounded-2xl bg-[#f7fafb] p-4"><div className="text-[#0b8f79]">{f.icon}</div><p className="mt-2 text-sm font-extrabold text-[#123b53]">{f.value}</p><p className="mt-0.5 text-[11px] text-[#7b8c97]">{f.label}</p></div>)}</div>}
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><div><span className="text-[#82929b]">Property type</span><p className="font-bold">{label(property.property_type)}</p></div><div><span className="text-[#82929b]">Category</span><p className="font-bold">{label(property.category)}</p></div><div><span className="text-[#82929b]">Furnishing</span><p className="font-bold">{label(property.furnishing)}</p></div><div><span className="text-[#82929b]">Possession</span><p className="font-bold">{label(property.possession)}</p></div></div>
            {property.description&&<div className="mt-6"><p className="text-xs font-extrabold uppercase tracking-[1.1px] text-[#547083]">Description</p><p className="mt-2 text-sm leading-6 text-[#687987]">{property.description}</p></div>}
          </div>
        </div>
        {canReview&&<div className="border-t border-[#e3eaed] bg-[#fbfdfd] p-5 sm:p-6"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><label className="text-xs font-extrabold uppercase tracking-[1px] text-[#547083]">Reviewer notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Add notes about verification, documents, photos or any issue…" className="mt-2 w-full resize-none rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#0bb89b]"/></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={saving} onClick={()=>onDecide(property.id,"rejected",notes)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e8c7c7] bg-white px-5 py-3 text-sm font-extrabold text-[#9b4d4d] hover:bg-[#fff6f6] disabled:opacity-50"><XCircle size={17}/>Reject</button><button type="button" disabled={saving} onClick={()=>onDecide(property.id,"approved",notes)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087f73] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#076d63] disabled:opacity-50"><CheckCircle2 size={17}/>{saving?"Saving…":"Approve & Publish"}</button></div></div></div>}
        {!canReview&&property.status==="pending_review"&&<div className="border-t border-[#e3eaed] bg-[#fffaf0] px-5 py-4 text-sm font-semibold text-[#8a691f]">This property is awaiting action by its assigned reviewer.</div>}
      </div></>:null}
    </div>
  </div>;
}

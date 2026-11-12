"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Home, LockKeyhole } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Invitation={id:string;property_id:string;invited_email:string;status:string;message:string|null;created_at:string};
type Property={id:string;title:string;city:string;locality:string};

export default function OwnerInvitationPage(){
 const [invitation,setInvitation]=useState<Invitation|null>(null);
 const [property,setProperty]=useState<Property|null>(null);
 const [email,setEmail]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [id,setId]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const invitationId=params.get("id")||"";setId(invitationId);if(!invitationId){setError("This invitation link is incomplete.");setLoading(false);return}void load(invitationId)},[]);
 const load=async(invitationId:string)=>{
  setLoading(true);setError("");
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){setSignedIn(false);setLoading(false);return}
  setSignedIn(true);setEmail(session.user.email||"");
  const r=await supabase.from("property_owner_invitations").select("id,property_id,invited_email,status,message,created_at").eq("id",invitationId).maybeSingle();
  if(r.error||!r.data){setError(r.error?.message||"Invitation not found. Make sure you are signed in with the invited email address.");setLoading(false);return}
  setInvitation(r.data as Invitation);
  const p=await supabase.from("properties").select("id,title,city,locality").eq("id",r.data.property_id).maybeSingle();
  if(p.data)setProperty(p.data as Property);
  setLoading(false);
 };
 const accept=async()=>{
  if(!invitation)return;setBusy(true);setError("");
  const r=await supabase.rpc("accept_property_owner_invitation",{p_invitation_id:invitation.id});
  if(r.error)setError(r.error.message);else setSuccess(true);
  setBusy(false);
 };
 const next="/owner/invitations?id="+encodeURIComponent(id);
 if(loading)return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb]"><div className="container py-24 text-center text-sm text-[#687987]">Loading invitation…</div></main><SiteFooter/></>;
 return <><SiteHeader/><main className="min-h-screen bg-[#f7fafb] text-[#102638]"><section className="container max-w-2xl py-16"><div className="rounded-3xl border border-[#dfe9ed] bg-white p-7 shadow-sm sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9faf6] text-[#087f73]">{success?<CheckCircle2 size={28}/>:<Home size={28}/>}</div>
 <p className="mt-7 text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Owner Invitation</p>
 <h1 className="mt-2 text-3xl font-extrabold tracking-[-1px]">{success?"Property successfully linked":"Claim your property"}</h1>
 {error&&<div className="mt-5 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}
 {success?<><p className="mt-4 text-sm leading-6 text-[#687987]">You are now recorded as the owner of this property on UNLIVO. Your broker remains associated as the listing representative.</p><a href="/owner" className="mt-7 inline-flex rounded-xl bg-[#123b53] px-5 py-3 text-sm font-bold text-white">Open Owner Dashboard</a></>:!signedIn?<><p className="mt-4 text-sm leading-6 text-[#687987]">Sign in or create a UNLIVO account using the email address to which this invitation was sent. You can accept the invitation after email verification.</p><div className="mt-6 rounded-xl bg-[#f1fbf8] p-4 text-sm text-[#087f73]"><LockKeyhole size={16} className="mr-2 inline"/>This link can only be accepted by the invited email address.</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><a href={"/login?next="+encodeURIComponent(next)} className="rounded-xl bg-[#123b53] px-5 py-3 text-center text-sm font-bold text-white">Sign in</a><a href={"/signup?next="+encodeURIComponent(next)} className="rounded-xl border border-[#cbdde3] px-5 py-3 text-center text-sm font-bold text-[#123b53]">Create account</a></div></>:invitation?<><div className="mt-5 rounded-2xl border border-[#dfe9ed] bg-[#f7fafb] p-5"><p className="text-xs font-bold uppercase tracking-[1px] text-[#71838e]">Property</p><h2 className="mt-2 text-xl font-extrabold">{property?.title||"UNLIVO property"}</h2><p className="mt-1 text-sm text-[#687987]">{[property?.locality,property?.city].filter(Boolean).join(", ")}</p><p className="mt-4 text-xs text-[#71838e]">Invitation sent to {invitation.invited_email}</p>{invitation.message&&<p className="mt-3 border-t border-[#e4ecef] pt-3 text-sm leading-6 text-[#536575]">{invitation.message}</p>}</div>
 {invitation.status==="pending"?email.toLowerCase()!==invitation.invited_email.toLowerCase()?<p className="mt-5 text-sm leading-6 text-[#8b4b4b]">You are signed in as <strong>{email}</strong>. Please sign out and sign in using <strong>{invitation.invited_email}</strong> to accept this invitation.</p>:<><p className="mt-5 text-sm leading-6 text-[#687987]">By accepting, you confirm that you are the legal owner or authorised owner representative for this property. UNLIVO will associate your account with the property. Your broker's listing relationship will remain separate.</p><button disabled={busy} onClick={()=>void accept()} className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#0bb89b] px-6 text-sm font-extrabold text-white disabled:opacity-50">{busy?"Accepting invitation…":"Accept & Claim Property"}</button></>:<p className="mt-5 text-sm font-semibold text-[#087f73]">This invitation status is {invitation.status}.</p>}</>:null}
 </div></section></main><SiteFooter/></>;
}

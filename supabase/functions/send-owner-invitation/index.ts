import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigins = new Set(["https://www.unlivo.com", "https://unlivo.com"]);
const headers = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://www.unlivo.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json",
});
const json = (body: Record<string, unknown>, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: headers(origin) });
const escapeHtml = (value: string) => value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
Deno.serve(async (req: Request) => {
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:headers(origin)});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authClient=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")??""}}});
  const {data:{user},error:authError}=await authClient.auth.getUser();
  if(authError||!user)return json({error:"Unauthorized"},401,origin);
  const {invitation_id}=await req.json();
  if(typeof invitation_id!=="string"||!invitation_id)return json({error:"Invitation ID is required."},400,origin);
  const admin=createClient(url,service);
  const {data:i,error}=await admin.from("property_owner_invitations").select("id,property_id,invited_by,invited_email,message,status,properties(title,city,locality)").eq("id",invitation_id).single();
  if(error||!i)return json({error:"Invitation not found."},404,origin);
  if(i.invited_by!==user.id)return json({error:"You are not authorised to send this invitation."},403,origin);
  if(i.status!=="pending")return json({error:"Only pending invitations can be emailed."},400,origin);
  const key=Deno.env.get("RESEND_API_KEY");
  if(!key){await admin.from("property_owner_invitations").update({email_error:"Email service is not configured."}).eq("id",i.id);return json({error:"Email service is not configured."},503,origin);}
  const p=i.properties as {title?:string;city?:string;locality?:string}|null;
  const title=p?.title||"a property on UNLIVO",location=[p?.locality,p?.city].filter(Boolean).join(", ");
  const link="https://www.unlivo.com/owner/invitations?id="+encodeURIComponent(i.id);
  const {data:profile}=await admin.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
  const broker=profile?.full_name||"Your property broker";
  const html=`<div style="font-family:Arial,sans-serif;color:#102638;max-width:620px;margin:24px auto;padding:28px;border:1px solid #dfe9ed;border-radius:18px"><div style="font-size:22px;font-weight:800;color:#087f73">UNLIVO</div><h1 style="font-size:24px;margin:24px 0 12px">Property owner invitation</h1><p style="font-size:15px;line-height:1.7"><strong>${escapeHtml(broker)}</strong> has invited you to claim your property on UNLIVO.</p><div style="background:#f5f8fa;border-radius:12px;padding:18px;margin:20px 0"><strong>${escapeHtml(title)}</strong>${location?`<div style="margin-top:6px;color:#687987">${escapeHtml(location)}</div>`:""}${i.message?`<p style="margin:14px 0 0;white-space:pre-wrap">${escapeHtml(i.message)}</p>`:""}</div><p style="font-size:14px;line-height:1.7">Sign in or create a UNLIVO account using this email address: <strong>${escapeHtml(i.invited_email)}</strong>. Your ownership will only be linked after you review and accept the invitation.</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;background:#071d2d;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">Review Owner Invitation</a></p><p style="font-size:12px;color:#687987;line-height:1.6">If you were not expecting this invitation, you can ignore this email. No ownership changes will occur unless you sign in with the invited email address and accept.</p></div>`;
  const from=Deno.env.get("EMAIL_FROM")||"UNLIVO <no-reply@auth.unlivo.com>";
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[i.invited_email],subject:"You have been invited to claim your property on UNLIVO",html,text:`${broker} invited you to claim ${title} on UNLIVO. Sign in using ${i.invited_email} and review the invitation here: ${link}. Ownership is only linked after you accept.`})});
  const body=await response.text();
  if(!response.ok){console.error("send-owner-invitation: Resend rejected email",response.status,body);await admin.from("property_owner_invitations").update({email_error:"Email delivery failed (Resend HTTP "+response.status+")."}).eq("id",i.id);return json({error:"The invitation was created, but the email could not be sent. You can copy the invitation link and share it manually."},502,origin);}
  let resendId:string|null=null;try{resendId=JSON.parse(body).id||null;}catch{/* ignore */}
  await admin.from("property_owner_invitations").update({email_sent_at:new Date().toISOString(),email_resend_id:resendId,email_error:null}).eq("id",i.id);
  return json({success:true,email_sent:true,recipient:i.invited_email},200,origin);
 }catch(error){const message=error instanceof Error?error.message:"Unexpected server error";console.error("send-owner-invitation: failed",message);return json({error:message},500,origin);}
});
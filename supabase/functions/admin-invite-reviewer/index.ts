import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function renderUnlivoEmail(input: {
  preheader?: string;
  heading: string;
  intro?: string;
  details?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  const preheader = escapeHtml(input.preheader || input.heading);
  const heading = escapeHtml(input.heading);
  const intro = input.intro || "";
  const details = input.details || "";
  const cta = input.ctaLabel && input.ctaUrl
    ? '<tr><td align="center" style="padding:8px 0 28px"><a href="' + escapeHtml(input.ctaUrl) + '" style="display:inline-block;background:#0bb89b;color:#071d2d;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:10px">' + escapeHtml(input.ctaLabel) + '</a></td></tr>'
    : "";
  const footer = escapeHtml(input.footer || "You are receiving this email because of activity related to your UNLIVO account.");
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>' + heading + '</title></head><body style="margin:0;padding:0;background:#f2f6f8;font-family:Arial,Helvetica,sans-serif;color:#102638"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + preheader + '</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6f8;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fff;border:1px solid #e1e9ed;border-radius:18px;overflow:hidden"><tr><td style="background:#071d2d;padding:24px 32px"><a href="https://www.unlivo.com" style="text-decoration:none"><img src="https://www.unlivo.com/unlivo-logo.svg" width="142" alt="UNLIVO" style="display:block;width:142px;height:auto;border:0;outline:none;text-decoration:none"></a></td></tr><tr><td style="padding:34px 32px 10px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#102638">' + heading + '</h1><div style="font-size:15px;line-height:1.75;color:#526575">' + intro + '</div>' + (details ? '<div style="margin:22px 0;background:#f4f8fa;border:1px solid #e6eef1;border-radius:12px;padding:18px;font-size:14px;line-height:1.7;color:#31495a">' + details + '</div>' : '') + '</td></tr>' + cta + '<tr><td style="padding:0 32px 28px"><div style="border-top:1px solid #e8eef1;padding-top:18px;font-size:12px;line-height:1.7;color:#84929c">' + footer + '<br><a href="https://www.unlivo.com" style="color:#087f73;text-decoration:none">www.unlivo.com</a></div></td></tr></table><div style="padding:18px 12px;font-size:11px;color:#9aa6ae">© ' + new Date().getFullYear() + ' UNLIVO. All rights reserved.</div></td></tr></table></body></html>';
}


function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = new Set(["https://www.unlivo.com", "https://unlivo.com"]);
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://www.unlivo.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    if (!email || !email.includes("@")) return new Response(JSON.stringify({ error: "A valid email address is required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    if (!firstName || !lastName) return new Response(JSON.stringify({ error: "First name and last name are required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return new Response(JSON.stringify({ error: listError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const match = existing.users.find((u) => u.email?.toLowerCase() === email);
    const fullName = `${firstName} ${lastName}`.trim();
    if (match) {
      const userMetadata = { ...(match.user_metadata ?? {}), first_name: firstName, last_name: lastName, reviewer_invite: false };
      const { error: authError } = await admin.auth.admin.updateUserById(match.id, { user_metadata: userMetadata });
      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
      const { error } = await admin.from("profiles").upsert({ id: match.id, email, full_name: fullName, role: "reviewer", access_status: "active", updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, existing: true, message: "Existing account promoted to reviewer." }), { headers: { ...headers, "Content-Type": "application/json" } });
    }
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return new Response(JSON.stringify({ error: "Email service is not configured." }), { status: 503, headers: { ...headers, "Content-Type": "application/json" } });
    const { data: invited, error: inviteError } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { first_name: firstName, last_name: lastName, reviewer_invite: true }, redirectTo: "https://www.unlivo.com/auth/confirm?type=invite" } });
    if (inviteError) return new Response(JSON.stringify({ error: inviteError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    if (!invited.user || !invited.properties?.action_link) return new Response(JSON.stringify({ error: "The reviewer invitation link could not be generated." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const inviteHtml = renderUnlivoEmail({ preheader: "You have been invited to join UNLIVO as a reviewer.", heading: "You are invited to UNLIVO", intro: "Hello " + escapeHtml(fullName) + ",<br><br>You have been invited to join UNLIVO as a property reviewer. Accept your invitation to securely set up your account and access your reviewer dashboard.", ctaLabel: "Accept Invitation", ctaUrl: invited.properties.action_link, footer: "This invitation was sent by a UNLIVO administrator. If you were not expecting it, you can ignore this email." });
    const emailResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>", to: [email], subject: "You are invited to join UNLIVO as a reviewer", html: inviteHtml, text: "You have been invited to join UNLIVO as a reviewer. Accept your invitation: " + invited.properties.action_link }) });
    if (!emailResponse.ok) { const errorText = await emailResponse.text(); console.error("admin-invite-reviewer: Resend rejected email", emailResponse.status, errorText); return new Response(JSON.stringify({ error: "The reviewer account was created, but the invitation email could not be sent. Please retry or contact support." }), { status: 502, headers: { ...headers, "Content-Type": "application/json" } }); }
    const { error: profileError } = await admin.from("profiles").upsert({ id: invited.user.id, email, full_name: fullName, role: "reviewer", access_status: "active", updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const { error: dbError } = await admin.from("reviewer_invites").upsert({ email, invited_by: user.id, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "email" });
    if (dbError) return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true, existing: false, message: `Invitation sent to ${fullName}.` }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});

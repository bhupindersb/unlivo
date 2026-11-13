import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
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


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

type Requirement = {
  id: string; user_id: string; purpose: string; category: string;
  property_types: string[] | null; preferred_cities: string[] | null; preferred_localities: string[] | null;
  min_price: number | null; max_price: number | null;
  min_bedrooms: number | null; max_bedrooms: number | null;
  min_area_sqft: number | null; max_area_sqft: number | null; status: string;
};

const arr = (v: string[] | null) => Array.isArray(v) ? v : [];
const inList = (values: string[], value: string | null) =>
  values.length === 0 || values.some(x => x.toLowerCase() === (value || "").toLowerCase());
const localityMatches = (values: string[], value: string | null) =>
  values.length === 0 || values.some(x => (value || "").toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes((value || "").toLowerCase()));

function score(r: Requirement, p: any) {
  const pp = p.purpose === r.purpose ? 20 : 0;
  const cp = p.category === r.category ? 15 : 0;
  const tp = inList(arr(r.property_types), p.property_type) && arr(r.property_types).length ? 15 : 0;
  const cityp = inList(arr(r.preferred_cities), p.city) && arr(r.preferred_cities).length ? 20 : 0;
  const lp = localityMatches(arr(r.preferred_localities), p.locality) && arr(r.preferred_localities).length ? 10 : 0;
  const value = p.purpose === "rent" ? Number(p.rent_monthly ?? NaN) : Number(p.price ?? NaN);
  const bp = r.min_price == null && r.max_price == null ? 0 : Number.isFinite(value) && (r.min_price == null || value >= r.min_price) && (r.max_price == null || value <= r.max_price) ? 10 : 0;
  const bp2 = r.min_bedrooms == null && r.max_bedrooms == null ? 0 : p.bedrooms != null && (r.min_bedrooms == null || p.bedrooms >= r.min_bedrooms) && (r.max_bedrooms == null || p.bedrooms <= r.max_bedrooms) ? 5 : 0;
  const ap = r.min_area_sqft == null && r.max_area_sqft == null ? 0 : p.area_sqft != null && (r.min_area_sqft == null || p.area_sqft >= r.min_area_sqft) && (r.max_area_sqft == null || p.area_sqft <= r.max_area_sqft) ? 5 : 0;
  const raw = pp + cp + tp + cityp + lp + bp + bp2 + ap;
  const max = 35 + (arr(r.property_types).length ? 15 : 0) + (arr(r.preferred_cities).length ? 20 : 0) + (arr(r.preferred_localities).length ? 10 : 0)
    + (r.min_price == null && r.max_price == null ? 0 : 10)
    + (r.min_bedrooms == null && r.max_bedrooms == null ? 0 : 5)
    + (r.min_area_sqft == null && r.max_area_sqft == null ? 0 : 5);
  return max ? Math.round(raw / max * 100) : 0;
}

const escapeHtml = (v: string) => v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const propertyId = typeof body?.property_id === "string" ? body.property_id : "";
    if (!propertyId) return json({ error: "property_id is required" }, 400);

    const admin = createClient(url, service);
    const { data: actor } = await admin.from("profiles").select("role,access_status").eq("id", user.id).maybeSingle();
    if (!actor || !["admin","reviewer"].includes(actor.role) || (actor.role === "reviewer" && actor.access_status === "revoked")) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: property, error: propertyError } = await admin.from("properties")
      .select("id,title,purpose,category,property_type,city,locality,price,rent_monthly,bedrooms,area_sqft,listed_by")
      .eq("id", propertyId).eq("status","published").maybeSingle();
    if (propertyError || !property) return json({ error: "Published property not found" }, 404);

    const { data: requirements, error: reqError } = await admin.from("buyer_requirements")
      .select("id,user_id,purpose,category,property_types,preferred_cities,preferred_localities,min_price,max_price,min_bedrooms,max_bedrooms,min_area_sqft,max_area_sqft,status")
      .eq("status","active").neq("user_id", property.listed_by);
    if (reqError) return json({ error: reqError.message }, 500);

    const matches = (requirements || []).map((r: Requirement) => ({ r, match: score(r, property) }))
      .filter(x => x.match >= 75);

    let created = 0, emailSent = 0, pushSent = 0;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:no-reply@auth.unlivo.com";

    if (vapidPrivate && vapidPublic) webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    for (const { r, match } of matches) {
      const { data: existing } = await admin.from("buyer_requirement_match_notifications")
        .select("id").eq("requirement_id", r.id).eq("property_id", property.id).maybeSingle();
      if (existing) continue;

      const { data: inserted, error: insertError } = await admin.from("buyer_requirement_match_notifications")
        .insert({ requirement_id:r.id, property_id:property.id, buyer_id:r.user_id, match_score:match })
        .select("id").single();
      if (insertError || !inserted) continue;
      created++;

      const subject = "A new property matches your UNLIVO requirement";
      const heading = "New property match";
      const location = [property.locality, property.city].filter(Boolean).join(", ");
      const value = property.purpose === "rent" ? (property.rent_monthly ? "₹ " + Number(property.rent_monthly).toLocaleString("en-IN") + "/month" : "Rent on request") : (property.price ? "₹ " + Number(property.price).toLocaleString("en-IN") : "Price on request");
      const message = property.title + " in " + location + " matches your requirement at " + match + "% (" + value + ").";
      const path = "/properties/" + property.id;

      let thisPush = false, thisEmail = false;
      if (vapidPrivate && vapidPublic) {
        const { data: subscriptions } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", r.user_id);
        for (const s of subscriptions || []) {
          try {
            await webpush.sendNotification({ endpoint:s.endpoint, keys:{p256dh:s.p256dh,auth:s.auth} }, JSON.stringify({
              title: subject, body: message, url:path, tag:"unlivo-property-match-" + property.id
            }));
            thisPush = true; pushSent++;
          } catch (e) {
            const code = (e as {statusCode?:number})?.statusCode;
            if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id",s.id);
          }
        }
      }

      if (resendKey) {
        const { data: recipient } = await admin.auth.admin.getUserById(r.user_id);
        if (recipient?.user?.email) {
          const html = renderUnlivoEmail({ preheader: heading, heading, intro: escapeHtml(message), ctaLabel: "View Property", ctaUrl: "https://www.unlivo.com" + path, footer: "You are receiving this because this property matches an active UNLIVO buyer requirement." });
          const response = await fetch("https://api.resend.com/emails", { method:"POST", headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json"}, body:JSON.stringify({from,to:[recipient.user.email],subject,html}) });
          if (response.ok) { thisEmail = true; emailSent++; }
        }
      }

      await admin.from("buyer_requirement_match_notifications").update({
        email_sent:thisEmail, push_sent:thisPush, sent_at:(thisEmail || thisPush) ? new Date().toISOString() : null
      }).eq("id", inserted.id);
    }

    return json({ ok:true, property_id:property.id, candidates:(requirements || []).length, matches:matches.length, notifications_created:created, email_sent:emailSent, push_sent:pushSent });
  } catch (e) {
    return json({ error:e instanceof Error ? e.message : "Match notification failed" }, 500);
  }
});
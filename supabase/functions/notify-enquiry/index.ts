import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name?.slice(0, 2) || "*"}***@${domain}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    console.log("notify-enquiry: request received");

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("notify-enquiry: authentication failed", authError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const { event, enquiry_id, message_id, visit_id } = await req.json();
    console.log("notify-enquiry: event", { event, enquiry_id, message_id, visit_id });

    if (!event || (!enquiry_id && !message_id && !visit_id)) {
      return json({ error: "Missing notification data" }, 400);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:no-reply@auth.unlivo.com";

    if (!serviceRoleKey) {
      console.error("notify-enquiry: SUPABASE_SERVICE_ROLE_KEY is missing");
      return json({ error: "Server configuration error: Supabase service role key is missing" }, 500);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    let recipientId = "";
    let senderId = "";
    let propertyId = "";
    let propertyTitle = "";
    let messageText = "";

    if (event === "new_enquiry") {
      const { data: e, error } = await admin
        .from("enquiries")
        .select("id,buyer_id,property_id,message,properties(title,listed_by)")
        .eq("id", enquiry_id)
        .single();

      if (error || !e) throw error || new Error("Enquiry not found");
      if (e.buyer_id !== user.id) return json({ error: "Forbidden" }, 403);

      recipientId = e.properties.listed_by;
      senderId = e.buyer_id;
      propertyId = e.property_id;
      propertyTitle = e.properties.title;
      messageText = e.message || "The buyer sent an enquiry without a message.";
    } else if (event === "reply") {
      const { data: m, error } = await admin
        .from("enquiry_messages")
        .select("id,enquiry_id,sender_id,body,enquiries(buyer_id,property_id,properties(title,listed_by))")
        .eq("id", message_id)
        .single();

      if (error || !m) throw error || new Error("Message not found");
      if (m.sender_id !== user.id) return json({ error: "Forbidden" }, 403);

      recipientId = m.sender_id === m.enquiries.buyer_id
        ? m.enquiries.properties.listed_by
        : m.enquiries.buyer_id;
      senderId = m.sender_id;
      propertyId = m.enquiries.property_id;
      propertyTitle = m.enquiries.properties.title;
      messageText = m.body;
    } else if (event === "new_site_visit" || event === "site_visit_update") {
      const { data: v, error } = await admin
        .from("site_visits")
        .select("id,requester_id,owner_id,property_id,requested_for,proposed_for,status,requester_note,owner_note,properties(title)")
        .eq("id", visit_id)
        .single();

      if (error || !v) throw error || new Error("Site visit not found");
      if (event === "new_site_visit" && v.requester_id !== user.id) return json({ error: "Forbidden" }, 403);
      if (event === "site_visit_update" && user.id !== v.requester_id && user.id !== v.owner_id) return json({ error: "Forbidden" }, 403);

      recipientId = user.id === v.requester_id ? v.owner_id : v.requester_id;
      senderId = user.id;
      propertyId = v.property_id;
      propertyTitle = v.properties.title;
      const visitTime = new Date(v.proposed_for || v.requested_for).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      messageText = event === "new_site_visit"
        ? (v.requester_note || `A buyer requested a site visit for ${visitTime}.`)
        : (v.owner_note || v.requester_note || `Site visit status: ${v.status.replaceAll("_", " ")}. Scheduled time: ${visitTime}.`);
    } else {
      return json({ error: "Unsupported event" }, 400);
    }

    if (!recipientId || recipientId === senderId) {
      return json({ ok: true, email_sent: false, push_sent: 0, reason: "No valid recipient" });
    }

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .maybeSingle();

    const senderName = senderProfile?.full_name || "A UNLIVO user";
    const subject = event === "new_enquiry"
      ? `New enquiry about ${propertyTitle}`
      : event === "reply"
        ? `New reply about ${propertyTitle}`
        : event === "new_site_visit"
          ? `New site visit request for ${propertyTitle}`
          : `Site visit update for ${propertyTitle}`;
    const targetPath =
      event === "new_enquiry" || event === "reply"
        ? `/enquiries?enquiry=${encodeURIComponent(enquiry_id || message_id)}`
        : `/visits?visit=${encodeURIComponent(visit_id)}`;

    let pushSent = 0;
    let pushRemoved = 0;

    if (vapidPrivateKey && vapidPublicKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const { data: subscriptions, error: subscriptionError } = await admin
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", recipientId);

      if (subscriptionError) {
        console.warn("notify-enquiry: push subscription lookup failed", subscriptionError.message);
      } else {
        const notificationTitle =
          event === "new_enquiry"
            ? `New enquiry for ${propertyTitle}`
            : event === "reply"
              ? `New reply for ${propertyTitle}`
              : event === "new_site_visit"
                ? `New visit request for ${propertyTitle}`
                : `Site visit update for ${propertyTitle}`;
        const notificationUrl = targetPath;
        const pushPayload = JSON.stringify({
          title: notificationTitle,
          body: `${senderName}: ${messageText}`.slice(0, 220),
          url: notificationUrl,
          tag: `unlivo-${event}-${enquiry_id || message_id || visit_id}`,
        });

        for (const subscription of subscriptions || []) {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            }, pushPayload);
            pushSent += 1;
          } catch (error) {
            const statusCode = (error as { statusCode?: number })?.statusCode;
            console.warn("notify-enquiry: push delivery failed", { statusCode, endpoint: subscription.endpoint.slice(0, 40) });
            if (statusCode === 404 || statusCode === 410) {
              await admin.from("push_subscriptions").delete().eq("id", subscription.id);
              pushRemoved += 1;
            }
          }
        }
      }
    } else {
      console.warn("notify-enquiry: VAPID secrets are not configured; skipping browser push");
    }

    let emailSent = false;
    let resendId: unknown = null;

    if (resendKey) {
      const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
      if (recipientError) throw recipientError;

      const recipientEmail = recipient.user?.email;
      if (recipientEmail) {
        const heading = event === "new_enquiry"
          ? "You have a new property enquiry"
          : event === "reply"
            ? "You have a new enquiry reply"
            : event === "new_site_visit"
              ? "You have a new site visit request"
              : "Your site visit has been updated";
        const html = `<div style="font-family:Arial,sans-serif;color:#102638;max-width:620px;margin:auto"><h2>${escapeHtml(heading)}</h2><p><strong>${escapeHtml(senderName)}</strong> sent a message regarding <strong>${escapeHtml(propertyTitle)}</strong>.</p><div style="background:#f5f8fa;border-radius:12px;padding:18px;margin:20px 0;white-space:pre-wrap">${escapeHtml(messageText)}</div><p><a href="https://www.unlivo.com${targetPath}"`} style="display:inline-block;background:#071d2d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Open Enquiry Inbox</a></p><p style="font-size:12px;color:#687987">You are receiving this because you are involved in this property enquiry.</p></div>`;
        const from = Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>";

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [recipientEmail], subject, html }),
        });
        const emailBody = await emailRes.text();

        if (emailRes.ok) {
          emailSent = true;
          try { resendId = JSON.parse(emailBody).id || null; } catch { resendId = null; }
          console.log("notify-enquiry: email sent", { resendId, recipient: maskEmail(recipientEmail) });
        } else {
          console.error("notify-enquiry: Resend rejected email", emailRes.status, emailBody);
        }
      }
    } else {
      console.warn("notify-enquiry: RESEND_API_KEY is missing; skipping email");
    }

    return json({ ok: true, email_sent: emailSent, push_sent: pushSent, push_removed: pushRemoved, resend_id: resendId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notification failed";
    console.error("notify-enquiry: unhandled error", message);
    return json({ error: message, email_sent: false, push_sent: 0 }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    const { event, enquiry_id, message_id } = await req.json();
    console.log("notify-enquiry: event", { event, enquiry_id, message_id });

    if (!event || (!enquiry_id && !message_id)) {
      return json({ error: "Missing notification data" }, 400);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    console.log("notify-enquiry: configuration", {
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasResendKey: Boolean(resendKey),
    });

    if (!serviceRoleKey) {
      console.error("notify-enquiry: SUPABASE_SERVICE_ROLE_KEY is missing");
      return json({ error: "Server configuration error: Supabase service role key is missing" }, 500);
    }

    if (!resendKey) {
      console.error("notify-enquiry: RESEND_API_KEY is missing");
      return json({ ok: false, email_sent: false, error: "RESEND_API_KEY is not configured" }, 500);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    let recipientId = "";
    let senderId = "";
    let propertyTitle = "";
    let messageText = "";

    if (event === "new_enquiry") {
      const { data: e, error } = await admin
        .from("enquiries")
        .select("id,buyer_id,property_id,message,properties(title,listed_by)")
        .eq("id", enquiry_id)
        .single();

      if (error || !e) {
        console.error("notify-enquiry: enquiry lookup failed", error?.message);
        throw error || new Error("Enquiry not found");
      }

      if (e.buyer_id !== user.id) {
        console.error("notify-enquiry: forbidden new enquiry notification", {
          buyerId: e.buyer_id,
          callerId: user.id,
        });
        return json({ error: "Forbidden" }, 403);
      }

      recipientId = e.properties.listed_by;
      senderId = e.buyer_id;
      propertyTitle = e.properties.title;
      messageText = e.message || "The buyer sent an enquiry without a message.";
    } else if (event === "reply") {
      const { data: m, error } = await admin
        .from("enquiry_messages")
        .select("id,enquiry_id,sender_id,body,enquiries(buyer_id,property_id,properties(title,listed_by))")
        .eq("id", message_id)
        .single();

      if (error || !m) {
        console.error("notify-enquiry: message lookup failed", error?.message);
        throw error || new Error("Message not found");
      }

      if (m.sender_id !== user.id) {
        console.error("notify-enquiry: forbidden reply notification", {
          senderId: m.sender_id,
          callerId: user.id,
        });
        return json({ error: "Forbidden" }, 403);
      }

      recipientId = m.sender_id === m.enquiries.buyer_id
        ? m.enquiries.properties.listed_by
        : m.enquiries.buyer_id;
      senderId = m.sender_id;
      propertyTitle = m.enquiries.properties.title;
      messageText = m.body;
    } else {
      return json({ error: "Unsupported event" }, 400);
    }

    console.log("notify-enquiry: resolved participants", {
      recipientId,
      senderId,
      propertyTitle,
    });

    if (!recipientId || recipientId === senderId) {
      console.warn("notify-enquiry: no valid recipient", { recipientId, senderId });
      return json({ ok: true, email_sent: false, reason: "No valid recipient" });
    }

    const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
    if (recipientError) {
      console.error("notify-enquiry: recipient lookup failed", recipientError.message);
      throw recipientError;
    }

    const { data: senderProfile, error: profileError } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .maybeSingle();

    if (profileError) {
      console.warn("notify-enquiry: sender profile lookup failed", profileError.message);
    }

    const recipientEmail = recipient.user?.email;
    if (!recipientEmail) {
      console.error("notify-enquiry: recipient has no email", { recipientId });
      return json({ ok: false, email_sent: false, error: "Recipient has no email address" }, 500);
    }

    const senderName = senderProfile?.full_name || "A UNLIVO user";
    const subject = event === "new_enquiry"
      ? `New enquiry about ${propertyTitle}`
      : `New reply about ${propertyTitle}`;
    const heading = event === "new_enquiry"
      ? "You have a new property enquiry"
      : "You have a new enquiry reply";

    const html = `<div style="font-family:Arial,sans-serif;color:#102638;max-width:620px;margin:auto"><h2>${escapeHtml(heading)}</h2><p><strong>${escapeHtml(senderName)}</strong> sent a message regarding <strong>${escapeHtml(propertyTitle)}</strong>.</p><div style="background:#f5f8fa;border-radius:12px;padding:18px;margin:20px 0;white-space:pre-wrap">${escapeHtml(messageText)}</div><p><a href="https://www.unlivo.com/my-properties" style="display:inline-block;background:#071d2d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Open UNLIVO</a></p><p style="font-size:12px;color:#687987">You are receiving this because you are involved in this property enquiry.</p></div>`;

    const from = Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>";

    console.log("notify-enquiry: sending via Resend", {
      from,
      recipient: maskEmail(recipientEmail),
      subject,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const emailBody = await emailRes.text();

    console.log("notify-enquiry: Resend response", {
      status: emailRes.status,
      ok: emailRes.ok,
      body: emailBody,
    });

    if (!emailRes.ok) {
      return json({
        ok: false,
        email_sent: false,
        error: "Resend rejected the email",
        resend_status: emailRes.status,
        resend_response: emailBody,
      }, 502);
    }

    let resendData: Record<string, unknown> = {};
    try {
      resendData = JSON.parse(emailBody);
    } catch {
      // Keep the raw response out of the success payload if it is not JSON.
    }

    console.log("notify-enquiry: email sent successfully", {
      resendId: resendData.id || null,
    });

    return json({
      ok: true,
      email_sent: true,
      resend_id: resendData.id || null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notification failed";
    console.error("notify-enquiry: unhandled error", message);
    return json({ error: message, email_sent: false }, 500);
  }
});
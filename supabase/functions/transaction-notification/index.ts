import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
type NotificationEvent = "payment_recorded" | "payment_received" | "completion_confirmed" | "transaction_cancelled";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return json({ error: "Server configuration error" }, 500);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const body = await req.json();
    const event = body?.event as NotificationEvent;
    const transactionId = typeof body?.transaction_id === "string" ? body.transaction_id : "";
    const paymentId = typeof body?.payment_id === "string" ? body.payment_id : null;
    if (!transactionId || !["payment_recorded","payment_received","completion_confirmed","transaction_cancelled"].includes(event)) return json({ error: "Missing or invalid notification data" }, 400);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: transaction, error: txError } = await admin.from("property_transactions").select("id,property_id,buyer_id,seller_id,agreed_amount,status,buyer_confirmed_at,seller_confirmed_at").eq("id", transactionId).single();
    if (txError || !transaction) return json({ error: "Transaction not found" }, 404);
    if (user.id !== transaction.buyer_id && user.id !== transaction.seller_id) return json({ error: "Forbidden" }, 403);
    const { data: property } = await admin.from("properties").select("id,title,city,locality").eq("id", transaction.property_id).maybeSingle();
    let amount: number | null = null;
    let paymentReference = "";
    if (paymentId) {
      const { data: payment } = await admin.from("property_transaction_payments").select("amount,reference").eq("id", paymentId).eq("transaction_id", transactionId).maybeSingle();
      if (payment) { amount = Number(payment.amount); paymentReference = payment.reference || ""; }
    }
    const otherId = user.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id;
    const recipientIds = event === "completion_confirmed" && transaction.status === "completed" ? [transaction.buyer_id, transaction.seller_id] : [otherId];
    const title = property?.title || "your UNLIVO transaction";
    const location = [property?.locality, property?.city].filter(Boolean).join(", ");
    const actorLabel = user.id === transaction.buyer_id ? "The buyer" : "The seller";
    let subject = ""; let heading = ""; let message = "";
    if (event === "payment_recorded") {
      subject = "Payment recorded for " + title; heading = "A payment has been recorded";
      message = "The buyer recorded a payment of ₹ " + Number(amount || 0).toLocaleString("en-IN") + (paymentReference ? " (reference: " + paymentReference + ")" : "") + ". Please review it and confirm receipt when the funds have been received.";
    } else if (event === "payment_received") {
      subject = "Payment receipt confirmed for " + title; heading = "Payment receipt confirmed";
      message = "The seller confirmed receipt of ₹ " + Number(amount || 0).toLocaleString("en-IN") + " for this transaction.";
    } else if (event === "completion_confirmed") {
      subject = (transaction.status === "completed" ? "Transaction completed: " : "Transaction confirmation recorded: ") + title;
      heading = transaction.status === "completed" ? "Transaction completed" : "Transaction confirmation recorded";
      message = transaction.status === "completed" ? "Both the buyer and seller have confirmed completion of this transaction." : actorLabel + " confirmed that their side of the transaction is completed. Your confirmation is still required.";
    } else {
      subject = "Transaction cancelled: " + title; heading = "Transaction cancelled";
      message = actorLabel + " cancelled the transaction. Please review the transaction details on UNLIVO.";
    }
    if (location) message += " Property: " + title + " — " + location + ".";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:no-reply@auth.unlivo.com";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>";
    const targetPath = "/transactions/" + transactionId;
    let pushSent = 0; let emailSent = 0;
    if (vapidPrivateKey && vapidPublicKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const { data: subscriptions } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", recipientIds);
      for (const subscription of subscriptions || []) {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: subject, body: message.slice(0, 220), url: targetPath, tag: "unlivo-transaction-" + event + "-" + transactionId }));
          pushSent++;
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          console.warn("transaction-notification: push delivery failed", { statusCode });
        }
      }
    }
    console.log("transaction-notification: email configuration", { resend_configured: Boolean(resendKey), email_from_configured: Boolean(Deno.env.get("EMAIL_FROM")) });

    if (resendKey) {
      for (const recipientId of recipientIds) {
        const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
        if (recipientError) { console.error("transaction-notification: recipient lookup failed", recipientError.message); continue; }
        if (!recipient?.user?.email) { console.error("transaction-notification: recipient has no email", recipientId); continue; }
        console.log("transaction-notification: attempting email", { recipient: recipient.user.email });
        const html = '<div style="font-family:Arial,sans-serif;color:#102638;max-width:620px;margin:auto"><h2>' + escapeHtml(heading) + '</h2><p>' + escapeHtml(message) + '</p><p><a href="https://www.unlivo.com' + targetPath + '" style="display:inline-block;background:#071d2d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Open Transaction</a></p><p style="font-size:12px;color:#687987">You are receiving this because you are involved in this UNLIVO property transaction.</p></div>';
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [recipient.user.email], subject, html }) });
        const emailBody = await response.text();
        if (response.ok) {
          emailSent++;
          let resendId = null;
          try { resendId = JSON.parse(emailBody).id || null; } catch { /* ignore malformed success body */ }
          console.log("transaction-notification: email sent", { recipient: recipient.user.email, resendId });
        } else {
          console.error("transaction-notification: Resend rejected email", response.status, emailBody);
        }
      }
    }
    if (!resendKey) console.error("transaction-notification: RESEND_API_KEY is missing; email was not attempted");
    return json({ ok: true, event, recipients: recipientIds.length, email_sent: emailSent, push_sent: pushSent, email_configured: Boolean(resendKey) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaction notification failed";
    console.error("transaction-notification: unhandled error", message);
    return json({ error: message, email_sent: 0, push_sent: 0 }, 500);
  }
});
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {global:{headers:{Authorization:auth}}});
    const {data:{user}} = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401,headers:{...cors,"Content-Type":"application/json"}});

    const {event, enquiry_id, message_id} = await req.json();
    if (!event || (!enquiry_id && !message_id)) return new Response(JSON.stringify({error:"Missing notification data"}), {status:400,headers:{...cors,"Content-Type":"application/json"}});

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return new Response(JSON.stringify({ok:true,email_sent:false,reason:"RESEND_API_KEY not configured"}), {headers:{...cors,"Content-Type":"application/json"}});

    let recipientId=""; let senderId=""; let propertyTitle=""; let messageText="";
    if (event === "new_enquiry") {
      const {data:e,error} = await admin.from("enquiries").select("id,buyer_id,property_id,message,properties(title,listed_by)").eq("id",enquiry_id).single();
      if (error || !e) throw error || new Error("Enquiry not found");
      if (e.buyer_id !== user.id) return new Response(JSON.stringify({error:"Forbidden"}), {status:403,headers:{...cors,"Content-Type":"application/json"}});
      recipientId=e.properties.listed_by; senderId=e.buyer_id; propertyTitle=e.properties.title; messageText=e.message || "The buyer sent an enquiry without a message.";
    } else if (event === "reply") {
      const {data:m,error} = await admin.from("enquiry_messages").select("id,enquiry_id,sender_id,body,enquiries(buyer_id,property_id,properties(title,listed_by))").eq("id",message_id).single();
      if (error || !m) throw error || new Error("Message not found");
      if (m.sender_id !== user.id) return new Response(JSON.stringify({error:"Forbidden"}), {status:403,headers:{...cors,"Content-Type":"application/json"}});
      recipientId = m.sender_id === m.enquiries.buyer_id ? m.enquiries.properties.listed_by : m.enquiries.buyer_id;
      senderId = m.sender_id; propertyTitle=m.enquiries.properties.title; messageText=m.body;
    } else throw new Error("Unsupported event");

    if (!recipientId || recipientId === senderId) return new Response(JSON.stringify({ok:true,email_sent:false}), {headers:{...cors,"Content-Type":"application/json"}});
    const {data:recipient} = await admin.auth.admin.getUserById(recipientId);
    const {data:senderProfile} = await admin.from("profiles").select("full_name").eq("id",senderId).maybeSingle();
    const recipientEmail=recipient.user?.email;
    if (!recipientEmail) return new Response(JSON.stringify({ok:true,email_sent:false,reason:"Recipient has no email"}), {headers:{...cors,"Content-Type":"application/json"}});
    const senderName=senderProfile?.full_name || "A UNLIVO user";
    const subject=event === "new_enquiry" ? `New enquiry about ${propertyTitle}` : `New reply about ${propertyTitle}`;
    const heading=event === "new_enquiry" ? "You have a new property enquiry" : "You have a new enquiry reply";
    const html=`<div style="font-family:Arial,sans-serif;color:#102638;max-width:620px;margin:auto"><h2>${heading}</h2><p><strong>${senderName}</strong> sent a message regarding <strong>${propertyTitle}</strong>.</p><div style="background:#f5f8fa;border-radius:12px;padding:18px;margin:20px 0;white-space:pre-wrap">${messageText}</div><p><a href="https://www.unlivo.com/my-properties" style="display:inline-block;background:#071d2d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Open UNLIVO</a></p><p style="font-size:12px;color:#687987">You are receiving this because you are involved in this property enquiry.</p></div>`;
    const emailRes=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("EMAIL_FROM") || "UNLIVO <no-reply@auth.unlivo.com>",to:[recipientEmail],subject,html})});
    const emailBody=await emailRes.text();
    if(!emailRes.ok) throw new Error(`Resend error: ${emailBody}`);
    return new Response(JSON.stringify({ok:true,email_sent:true}),{headers:{...cors,"Content-Type":"application/json"}});
  } catch (e) {
    return new Response(JSON.stringify({error:e instanceof Error?e.message:"Notification failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  }
});
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit a valid form." }, { status: 400 });
  }

  // Honeypot: silently accept automated submissions without sending email.
  if (clean(body.website, 200)) return NextResponse.json({ success: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 254);
  const subject = clean(body.subject, 150);
  const message = clean(body.message, 5000);

  if (name.length < 2 || !emailPattern.test(email) || subject.length < 3 || message.length < 10) {
    return NextResponse.json({ error: "Please check the fields and try again." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The contact form is temporarily unavailable. Please email support@unlivo.com directly." }, { status: 503 });
  }

  const safeSubject = subject.replace(/[\r\n]+/g, " ");
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "UNLIVO Website <support@unlivo.com>",
      to: ["support@unlivo.com"],
      reply_to: email,
      subject: `Website enquiry: ${safeSubject}`,
      text: [
        "A new message was submitted through the UNLIVO contact form.",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${safeSubject}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    }),
    cache: "no-store",
  });

  if (!emailResponse.ok) {
    console.error("UNLIVO contact email delivery failed:", emailResponse.status, await emailResponse.text());
    return NextResponse.json({ error: "We couldn't send your message right now. Please try again later or email support@unlivo.com." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}

"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't send your message. Please try again.");
      form.reset();
      setStatus("success");
      setMessage("Thank you for contacting UNLIVO. Your message has been sent to our support team.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please email support@unlivo.com.");
    }
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-[#d7e2e8] bg-white px-4 py-3 text-[15px] text-[#102638] outline-none transition placeholder:text-[#91a0aa] focus:border-[#0b9b87] focus:ring-4 focus:ring-[#0b9b87]/10";

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-describedby="contact-form-status">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-[#183447]">Your name
          <input className={fieldClass} name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required placeholder="Enter your name" />
        </label>
        <label className="block text-sm font-semibold text-[#183447]">Email address
          <input className={fieldClass} name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-[#183447]">Subject
        <input className={fieldClass} name="subject" type="text" minLength={3} maxLength={150} required placeholder="How can we help?" />
      </label>
      <label className="block text-sm font-semibold text-[#183447]">Message
        <textarea className={fieldClass} name="message" rows={6} minLength={10} maxLength={5000} required placeholder="Write your message here..." />
      </label>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button type="submit" disabled={status === "sending"} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0b9b87] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#087f73] disabled:cursor-not-allowed disabled:opacity-60">
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      <p id="contact-form-status" role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-red-700" : status === "success" ? "text-[#087f73]" : "text-[#5c6e7c]"}`}>
        {message || "Your message will be sent securely to support@unlivo.com."}
      </p>
    </form>
  );
}

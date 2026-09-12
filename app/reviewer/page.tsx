"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ReviewerDashboard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [name, setName] = useState("Reviewer");

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    (async () => {
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { window.location.href = "/reviewer/login"; return; }
      const { data: profile } = await client.from("profiles").select("role, full_name").eq("id", auth.user.id).maybeSingle();
      if (profile?.role !== "reviewer") { await client.auth.signOut(); window.location.href = "/reviewer/login"; return; }
      setName(profile.full_name || "Reviewer");
      setAllowed(true);
    })();
  }, []);

  if (!allowed) return <main className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#607889]">Checking secure access…</main>;

  return (
    <main className="min-h-screen bg-[#f5f8fa]">
      <div className="border-b bg-white"><div className="mx-auto flex h-[78px] max-w-6xl items-center justify-between px-5"><a href="/" className="block w-[180px] sm:w-[220px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><div className="flex items-center gap-4"><span className="hidden text-sm text-[#607889] sm:block">{name}</span><a href="/profile" className="rounded-full border border-[#d7e3e8] px-4 py-2 text-sm font-semibold text-[#193246]">Profile</a></div></div></div>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f73]">UNLIVO Property Review</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#071d2d]">Welcome, {name}.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607889]">Review the properties assigned to you and help keep UNLIVO's marketplace accurate and trustworthy.</p></div>
        <a href="/admin/properties" className="group block rounded-2xl border border-[#dce7eb] bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f7f4] text-xl">✓</div><h2 className="mt-5 text-xl font-bold text-[#071d2d]">My Review Queue</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607889]">Open your assigned property reviews, inspect listing details and media, then approve or reject each submission with an appropriate review note.</p><span className="mt-6 inline-block rounded-full bg-[#071d2d] px-5 py-3 text-sm font-bold text-white">Open assigned reviews →</span></a>
        <div className="mt-8 rounded-2xl border border-[#dce7eb] bg-white p-6"><h2 className="font-bold text-[#071d2d]">Reviewer access</h2><p className="mt-2 text-sm leading-6 text-[#607889]">Your account must have the <strong>reviewer</strong> role and review assignments are enforced at the database level. A reviewer cannot approve or reject properties assigned to someone else.</p></div>
      </div>
    </main>
  );
}

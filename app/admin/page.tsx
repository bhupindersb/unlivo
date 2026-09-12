"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [name, setName] = useState("Admin");

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    (async () => {
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { window.location.href = "/admin/login"; return; }
      const { data: profile } = await client.from("profiles").select("role, full_name").eq("id", auth.user.id).maybeSingle();
      if (profile?.role !== "admin") { await client.auth.signOut(); window.location.href = "/admin/login"; return; }
      setName(profile.full_name || "Admin");
      setAllowed(true);
    })();
  }, []);

  if (!allowed) return <main className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#607889]">Checking secure access…</main>;

  return (
    <main className="min-h-screen bg-[#f5f8fa]">
      <div className="border-b bg-white"><div className="mx-auto flex h-[78px] max-w-6xl items-center justify-between px-5"><a href="/" className="block w-[180px] sm:w-[220px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a><div className="flex items-center gap-4"><span className="hidden text-sm text-[#607889] sm:block">{name}</span><a href="/profile" className="rounded-full border border-[#d7e3e8] px-4 py-2 text-sm font-semibold text-[#193246]">Profile</a></div></div></div>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f73]">UNLIVO Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#071d2d]">Good to see you, {name}.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607889]">Manage property moderation, reviewers and the operational side of the UNLIVO marketplace.</p></div>
        <div className="grid gap-5 md:grid-cols-2">
          <a href="/admin/properties" className="group rounded-2xl border border-[#dce7eb] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f7f4] text-xl">✓</div><h2 className="text-lg font-bold text-[#071d2d]">Property Review</h2><p className="mt-2 text-sm leading-6 text-[#607889]">Review submitted properties, assign reviewers, approve listings or reject them with notes.</p><span className="mt-5 inline-block text-sm font-bold text-[#087f73] group-hover:text-[#065f57]">Open review queue →</span></a>
          <a href="/admin/properties" className="group rounded-2xl border border-[#dce7eb] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3f7] text-xl">+</div><h2 className="text-lg font-bold text-[#071d2d]">Reviewer Management</h2><p className="mt-2 text-sm leading-6 text-[#607889]">Invite new reviewers and manage reviewer assignments from the administration area.</p><span className="mt-5 inline-block text-sm font-bold text-[#087f73] group-hover:text-[#065f57]">Manage reviewers →</span></a>
        </div>
        <div className="mt-8 rounded-2xl border border-[#dce7eb] bg-white p-6"><h2 className="font-bold text-[#071d2d]">Security</h2><p className="mt-2 text-sm leading-6 text-[#607889]">This dashboard requires an authenticated account whose database role is explicitly set to <strong>admin</strong>. Directly visiting this URL does not bypass role-based access controls.</p></div>
      </div>
    </main>
  );
}

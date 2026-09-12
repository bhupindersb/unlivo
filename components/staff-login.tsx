"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export default function StaffLogin({ role }: { role: "admin" | "reviewer" }) {
  const isAdmin = role === "admin";
  const title = isAdmin ? "Admin Portal" : "Reviewer Portal";
  const subtitle = isAdmin
    ? "Secure access for UNLIVO administrators"
    : "Secure access for UNLIVO property reviewers";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!supabase) {
      setError("Authentication is temporarily unavailable. Please try again.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message || "Unable to sign in. Please check your credentials.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role !== role) {
      await supabase.auth.signOut();
      setError(
        isAdmin
          ? "This account does not have Admin access."
          : "This account does not have Reviewer access."
      );
      setLoading(false);
      return;
    }

    window.location.href = isAdmin ? "/admin" : "/reviewer";
  }

  return (
    <main className="min-h-screen bg-[#f5f8fa] px-5 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-[#dce7eb] bg-white shadow-[0_24px_70px_rgba(7,29,45,0.10)]">
          <div className="border-b border-[#e6eef1] px-8 pb-7 pt-9 text-center">
            <a href="/" aria-label="UNLIVO home" className="mx-auto block w-[190px]">
              <img src="/unlivo-logo.svg" alt="UNLIVO" className="h-auto w-full" />
            </a>
            <div className="mt-7 inline-flex rounded-full bg-[#e8f7f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#087f73]">
              {isAdmin ? "Administration" : "Property Review"}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#071d2d]">{title}</h1>
            <p className="mt-2 text-sm text-[#607889]">{subtitle}</p>
          </div>

          <form onSubmit={submit} className="space-y-5 px-8 py-8">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#193246]">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="h-12 w-full rounded-xl border border-[#d5e1e6] px-4 text-sm outline-none transition focus:border-[#0bb89b] focus:ring-4 focus:ring-[#0bb89b]/10"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#193246]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-xl border border-[#d5e1e6] px-4 text-sm outline-none transition focus:border-[#0bb89b] focus:ring-4 focus:ring-[#0bb89b]/10"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#071d2d] text-sm font-bold text-white transition hover:bg-[#102f44] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : `Sign in to ${isAdmin ? "Admin" : "Reviewer"}`}
            </button>

            <p className="text-center text-xs leading-5 text-[#718796]">
              Access is controlled by your UNLIVO account role. Having the URL alone does not grant access.
            </p>
          </form>

          <div className="border-t border-[#e6eef1] px-8 py-5 text-center">
            <a href="/" className="text-sm font-semibold text-[#087f73] hover:text-[#065f57]">← Back to UNLIVO</a>
          </div>
        </div>
      </div>
    </main>
  );
}

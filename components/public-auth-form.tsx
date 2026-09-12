"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function PublicAuthForm({ mode }: { mode: "signup" | "login" }) {
  const isSignup = mode === "signup";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.replace("/");
    });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
            data: {
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
              phone: phone.trim() || null,
            },
          },
        });
        if (result.error) throw result.error;

        if (result.data.session) {
          window.location.replace("/");
          return;
        }

        setMessage("Account created. Please check your email and confirm your address before logging in.");
      } else {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error) throw result.error;
        window.location.replace("/");
      }
    } catch (e: any) {
      setError(e?.message || "We could not complete your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <a href="/" aria-label="UNLIVO home" className="inline-block">
              <img src="/unlivo-logo.svg" alt="UNLIVO" className="mx-auto w-[210px]" />
            </a>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">
              {isSignup ? "Join UNLIVO" : "Welcome back"}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] sm:text-4xl">
              {isSignup ? "Create your account" : "Log in to UNLIVO"}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#687987]">
              {isSignup
                ? "Create your free account to discover properties, save listings, make enquiries and manage your property journey."
                : "Sign in to continue to your UNLIVO account and access your saved properties, enquiries and listings."}
            </p>
          </div>

          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-[0_18px_55px_rgba(16,38,56,0.08)] sm:p-8">
            {message && (
              <div className="mb-5 rounded-xl border border-[#bfe9df] bg-[#effbf8] px-4 py-3 text-sm font-semibold leading-5 text-[#087f73]">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-5 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold leading-5 text-[#8b4b4b]">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              {isSignup && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" icon={<UserRound size={17} />} />
                  <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" icon={<UserRound size={17} />} />
                </div>
              )}

              <Field label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" icon={<Mail size={17} />} required />

              {isSignup && (
                <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" icon={<Phone size={17} />} hint="Optional — you can verify it later from your profile." />
              )}

              <Field label="Password" value={password} onChange={setPassword} placeholder={isSignup ? "At least 6 characters" : "Your password"} type="password" icon={<LockKeyhole size={17} />} required minLength={6} />

              <button
                type="submit"
                disabled={busy || !email || !password}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#071d2d] px-5 text-sm font-extrabold text-white transition hover:bg-[#102f44] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Please wait…" : isSignup ? "Create Account" : "Log In"}
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="mt-7 border-t border-[#e8eef1] pt-6 text-center text-sm text-[#687987]">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <a href={isSignup ? "/login" : "/signup"} className="font-extrabold text-[#087f73] hover:text-[#066c62]">
                {isSignup ? "Log in" : "Create one"}
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-[#7b8c97]">
            By continuing, you agree to use UNLIVO responsibly and provide accurate information about yourself and your properties.
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  required = false,
  minLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon: React.ReactNode;
  required?: boolean;
  minLength?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[1.3px] text-[#547083]">
        {label}{!required && <span className="ml-1 font-semibold normal-case tracking-normal text-[#8a9aa4]">(Optional)</span>}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-[#7b8c97]">{icon}</span>
        <input
          className="w-full rounded-xl border border-[#d7e3e8] bg-white py-3 pl-11 pr-4 text-sm text-[#102638] outline-none transition focus:border-[#0bb89b] focus:ring-2 focus:ring-[#0bb89b]/10"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "on"}
        />
      </div>
      {hint && <p className="mt-2 text-xs leading-5 text-[#7b8c97]">{hint}</p>}
    </div>
  );
}

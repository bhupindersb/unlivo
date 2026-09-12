"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LogOut, Menu, UserCircle, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
      const { data } = await client.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const p = await client.from("profiles").select("role,full_name").eq("id", data.user.id).maybeSingle();
        setRole(p.data?.role || "");
        const metadata = data.user.user_metadata || {};
        const metadataName = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim();
        setName(p.data?.full_name || metadataName || data.user.email?.split("@")[0] || "there");
      }
    };
    load();
    const { data } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setRole(""); setName(""); setOpen(false); return; }
      const p = await client.from("profiles").select("role,full_name").eq("id", session.user.id).maybeSingle();
      setRole(p.data?.role || "");
      const metadata = session.user.user_metadata || {};
      const metadataName = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim();
      setName(p.data?.full_name || metadataName || session.user.email?.split("@")[0] || "there");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const logout = async () => { if (supabase) await supabase.auth.signOut(); window.location.href = "/"; };
  const nav = ["Buy", "Rent", "Sell", "For Brokers"];
  const navHref = (item: string) => item === "Sell" ? (user ? "/post-property" : "/login") : "/properties";
  const staffHref = role === "admin" ? "/admin" : "/reviewer";
  const staffLabel = role === "admin" ? "Admin Portal" : "Reviewer Portal";

  return (
    <header className={`${overlay ? "absolute left-0 right-0 top-0 z-30" : "border-b bg-white"}`}>
      <div className="container flex h-[78px] items-center justify-between gap-5">
        <a href="/" aria-label="UNLIVO home" className="block w-[180px] shrink-0 sm:w-[230px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="h-auto w-full" /></a>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => <a key={item} href={navHref(item)} className="cursor-pointer text-[13px] font-medium text-[#193246] transition hover:text-[#08aa91]">{item}</a>)}
          <a href="/#resources" className="flex cursor-pointer items-center gap-1 text-[13px] font-medium text-[#193246] hover:text-[#08aa91]">Resources <ChevronDown size={15} /></a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? <div className="relative">
            <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#d7e3e8] bg-white px-4 text-[13px] font-bold text-[#193246] transition hover:border-[#0bb89b] hover:shadow-sm"><UserCircle size={18} className="text-[#087f73]" /><span className="max-w-[145px] truncate">Welcome, {name}</span><ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>
            {open && <div className="absolute right-0 top-[52px] z-50 w-60 overflow-hidden rounded-2xl border border-[#dfe9ed] bg-white p-2 shadow-[0_18px_50px_rgba(16,38,56,0.14)]" role="menu">
              <div className="border-b border-[#e8eef1] px-3 py-3"><p className="text-xs font-semibold uppercase tracking-[1.2px] text-[#7b8c97]">Signed in as</p><p className="mt-1 truncate text-sm font-extrabold text-[#102638]">{user.email}</p></div>
              <div className="py-1"><a href="/my-properties" onClick={() => setOpen(false)} className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-[#193246] hover:bg-[#f3f8f9]">My Properties</a><a href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#193246] hover:bg-[#f3f8f9]"><UserCircle size={16} /> Profile</a>{(role === "admin" || role === "reviewer") && <a href={staffHref} onClick={() => setOpen(false)} className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-[#193246] hover:bg-[#f3f8f9]">{staffLabel}</a>}<a href="/post-property" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-center rounded-xl bg-[#071d2d] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#102f44]">Post Property</a></div>
              <div className="border-t border-[#e8eef1] pt-1"><button onClick={logout} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#8b4b4b] hover:bg-[#fff7f7]"><LogOut size={16} /> Logout</button></div>
            </div>}
          </div> : <><a href="/login" className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-[#193246]">Login</a><a href="/signup" className="cursor-pointer rounded-full bg-[#071d2d] px-6 py-3 text-[13px] font-bold text-white shadow-lg hover:bg-[#102f44]">Sign Up</a></>}
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu" className="cursor-pointer rounded-xl p-2 md:hidden">{mobileOpen ? <X /> : <Menu />}</button>
      </div>
      {mobileOpen && <div className="border-t bg-white px-5 py-5 shadow-lg md:hidden"><div className="container grid gap-3">
        {nav.map((item) => <a key={item} href={navHref(item)} className="rounded-lg px-3 py-3 text-sm font-semibold">{item}</a>)}
        <a href="/#resources" className="rounded-lg px-3 py-3 text-sm font-semibold">Resources</a>
        {user ? <><button onClick={() => setOpen(!open)} className="flex cursor-pointer items-center justify-between rounded-xl border border-[#d7e3e8] px-3 py-3 text-left text-sm font-bold"><span className="flex items-center gap-2"><UserCircle size={18} className="text-[#087f73]" /> Welcome, {name}</span><ChevronDown size={17} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div className="grid gap-1 rounded-2xl bg-[#f7fafb] p-2"><a href="/my-properties" className="rounded-lg px-3 py-3 text-sm font-semibold">My Properties</a><a href="/profile" className="rounded-lg px-3 py-3 text-sm font-semibold">Profile</a>{(role === "admin" || role === "reviewer") && <a href={staffHref} className="rounded-lg px-3 py-3 text-sm font-semibold">{staffLabel}</a>}<a href="/post-property" className="rounded-lg bg-[#071d2d] px-3 py-3 text-sm font-bold text-white">Post Property</a><button onClick={logout} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#8b4b4b]"><LogOut size={16} /> Logout</button></div>}</> : <><a href="/login" className="rounded-lg px-3 py-3 text-sm font-semibold">Login</a><a href="/signup" className="rounded-lg bg-[#071d2d] px-3 py-3 text-sm font-bold text-white">Sign Up</a></>}
      </div></div>}
    </header>
  );
}

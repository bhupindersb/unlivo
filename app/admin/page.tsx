"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HandCoins,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  UserRound,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Metric = { label: string; value: number | string; icon: typeof Users; tone?: string; href?: string };
type RecentProperty = { id: string; title: string | null; city: string | null; locality: string | null; status: string; created_at: string };
type RecentRequirement = { id: string; preferred_cities: string[] | null; preferred_localities: string[] | null; min_price: number | null; max_price: number | null; status: string; created_at: string };
type RecentEnquiry = { id: string; property_id: string; status: string; created_at: string };

const statusLabel = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const formatMoney = (value: number | null) => value == null ? "Budget open" : value >= 10000000 ? `₹${(value / 10000000).toFixed(1)} Cr` : `₹${(value / 100000).toFixed(0)} L`;

export default function AdminDashboard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [name, setName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<number[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentRequirements, setRecentRequirements] = useState<RecentRequirement[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<RecentEnquiry[]>([]);

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

      const count = async (table: string, filter?: (query: any) => any) => {
        let query = client.from(table).select("id", { count: "exact", head: true });
        if (filter) query = filter(query);
        const result = await query;
        return result.count || 0;
      };

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        owners,
        brokers,
        builders,
        reviewers,
        totalProperties,
        published,
        pendingReview,
        rejected,
        sold,
        rented,
        activeRequirements,
        totalEnquiries,
        newEnquiries,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        propertyTrend,
        recentP,
        recentR,
        recentE,
      ] = await Promise.all([
        count("profiles"),
        count("profiles", (q) => q.eq("role", "owner")),
        count("profiles", (q) => q.eq("role", "broker")),
        count("profiles", (q) => q.eq("role", "builder")),
        count("profiles", (q) => q.eq("role", "reviewer")),
        count("properties"),
        count("properties", (q) => q.eq("status", "published")),
        count("properties", (q) => q.eq("status", "pending_review")),
        count("properties", (q) => q.eq("status", "rejected")),
        count("properties", (q) => q.eq("status", "sold")),
        count("properties", (q) => q.eq("status", "rented")),
        count("buyer_requirements", (q) => q.eq("status", "active")),
        count("enquiries"),
        count("enquiries", (q) => q.eq("status", "new")),
        count("property_reviews", (q) => q.eq("decision", "pending")),
        count("property_reviews", (q) => q.eq("decision", "approved")),
        count("property_reviews", (q) => q.eq("decision", "rejected")),
        client.from("properties").select("created_at").gte("created_at", sixMonthsAgo.toISOString()).order("created_at", { ascending: true }),
        client.from("properties").select("id,title,city,locality,status,created_at").order("created_at", { ascending: false }).limit(6),
        client.from("buyer_requirements").select("id,preferred_cities,preferred_localities,min_price,max_price,status,created_at").order("created_at", { ascending: false }).limit(5),
        client.from("enquiries").select("id,property_id,status,created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const failed = [propertyTrend, recentP, recentR, recentE].find((result) => result.error);
      if (failed?.error) setError(failed.error.message);

      setMetrics({ totalUsers, owners, brokers, builders, reviewers, totalProperties, published, pendingReview, rejected, sold, rented, activeRequirements, totalEnquiries, newEnquiries, pendingReviews, approvedReviews, rejectedReviews });
      setRecentProperties((recentP.data || []) as RecentProperty[]);
      setRecentRequirements((recentR.data || []) as RecentRequirement[]);
      setRecentEnquiries((recentE.data || []) as RecentEnquiry[]);

      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(sixMonthsAgo);
        date.setMonth(sixMonthsAgo.getMonth() + index);
        return date;
      });
      const trend = months.map((month) => {
        const next = new Date(month);
        next.setMonth(month.getMonth() + 1);
        return (propertyTrend.data || []).filter((item: { created_at: string }) => {
          const created = new Date(item.created_at);
          return created >= month && created < next;
        }).length;
      });
      setMonthly(trend);
      setLoading(false);
    })();
  }, []);

  const maxMonthly = Math.max(...monthly, 1);
  const approvalRate = useMemo(() => {
    const decided = metrics.approvedReviews + metrics.rejectedReviews;
    return decided ? Math.round((metrics.approvedReviews / decided) * 100) : 0;
  }, [metrics]);

  const topMetrics: Metric[] = [
    { label: "Total Users", value: metrics.totalUsers || 0, icon: Users, tone: "bg-[#eaf7f4] text-[#087f73]" },
    { label: "Owners", value: metrics.owners || 0, icon: UserRound, tone: "bg-[#eef4f8] text-[#345d75]" },
    { label: "Brokers", value: metrics.brokers || 0, icon: UserRoundCheck, tone: "bg-[#f2eef9] text-[#72529a]" },
    { label: "Builders", value: metrics.builders || 0, icon: Building2, tone: "bg-[#f8f2e9] text-[#9a6a32]" },
    { label: "Reviewers", value: metrics.reviewers || 0, icon: ShieldCheck, tone: "bg-[#edf3f8] text-[#3e627b]" },
  ];

  const propertyMetrics = [
    { label: "Total Properties", value: metrics.totalProperties || 0, icon: Building2, bg: "#eef4f8" },
    { label: "Published", value: metrics.published || 0, icon: CheckCircle2, bg: "#eaf7f4" },
    { label: "Under Review", value: metrics.pendingReview || 0, icon: Clock3, bg: "#fff7e8" },
    { label: "Rejected", value: metrics.rejected || 0, icon: XCircle, bg: "#fff1f1" },
    { label: "Sold / Rented", value: (metrics.sold || 0) + (metrics.rented || 0), icon: HandCoins, bg: "#f3eef9" },
    { label: "Active Requirements", value: metrics.activeRequirements || 0, icon: ClipboardList, bg: "#eef4f8" },
  ];

  if (loading || allowed === null) return <main className="min-h-screen bg-[#f5f8fa] text-[#102638]"><div className="flex min-h-screen items-center justify-center text-sm text-[#607889]">Loading secure operations dashboard…</div></main>;

  return (
    <main className="min-h-screen bg-[#f5f8fa] text-[#102638]">
      <header className="border-b border-[#dfe8ec] bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <a href="/" className="block w-[175px] sm:w-[215px]"><img src="/unlivo-logo.svg" alt="UNLIVO" className="w-full" /></a>
          <div className="flex items-center gap-3"><span className="hidden text-sm font-semibold text-[#607889] sm:block">{name}</span><a href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-[#193246] transition hover:bg-[#f1f8f7] hover:text-[#087f73]">View site</a><a href="/profile" className="rounded-xl border border-[#d7e3e8] px-4 py-2 text-sm font-semibold text-[#193246] transition hover:border-[#0bb89b] hover:bg-[#f8fcfb]">Profile</a></div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <aside className="hidden w-[245px] shrink-0 border-r border-[#dfe8ec] bg-white lg:block">
          <div className="sticky top-0 p-5">
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Operations</p>
            <nav className="grid gap-1">
              <a href="/admin" className="flex items-center gap-3 rounded-xl bg-[#eaf7f4] px-3 py-3 text-sm font-bold text-[#087f73]"><LayoutDashboard size={17} /> Dashboard</a>
              <a href="/admin/properties" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#193246] transition hover:bg-[#f1f8f7] hover:text-[#087f73]"><Building2 size={17} /> Properties</a>
              <div className="my-2 border-t border-[#edf1f3]" />
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><Users size={17} /> Users <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><ShieldCheck size={17} /> Reviewers <em className="ml-auto text-[10px] not-italic">In Properties</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><ClipboardList size={17} /> Buyer Requirements <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><MessageSquare size={17} /> Leads & Enquiries <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <div className="my-2 border-t border-[#edf1f3]" />
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><HandCoins size={17} /> Revenue <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><BarChart3 size={17} /> Reports <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><Settings size={17} /> Settings <em className="ml-auto text-[10px] not-italic">Soon</em></span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9aa7ae]"><Activity size={17} /> Audit Logs <em className="ml-auto text-[10px] not-italic">Soon</em></span>
            </nav>
            <div className="mt-8 rounded-2xl bg-[#f5f8fa] p-4"><p className="text-xs font-bold text-[#193246]">UNLIVO Operations</p><p className="mt-1 text-xs leading-5 text-[#71838e]">A single view of marketplace health, moderation and demand.</p></div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-8 lg:px-9 lg:py-10">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">UNLIVO Operations</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-1px] text-[#071d2d] lg:text-4xl">Good to see you, {name}.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#607889]">Monitor the marketplace, keep property quality high and see where the next operational work is building up.</p></div>
            <a href="/admin/properties" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#071d2d] px-5 text-sm font-bold text-white transition hover:bg-[#102f44] hover:shadow-lg"><ClipboardList size={17} /> Open review queue</a>
          </div>

          {error && <div className="mb-6 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">Some dashboard data could not be loaded: {error}</div>}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {topMetrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-2xl border border-[#dce7eb] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}><Icon size={18} /></div><span className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#9aa7ae]">Users</span></div><p className="mt-5 text-3xl font-extrabold tracking-tight text-[#071d2d]">{metric.value}</p><p className="mt-1 text-xs font-semibold text-[#71838e]">{metric.label}</p></div>; })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {propertyMetrics.map(({ label, value, icon: Icon, bg }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#dce7eb] bg-white px-4 py-4 shadow-sm"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#087f73]" style={{ backgroundColor: bg }}><Icon size={17} /></div><div className="min-w-0"><p className="text-xl font-extrabold text-[#071d2d]">{value}</p><p className="truncate text-[11px] font-semibold text-[#71838e]">{label}</p></div></div>)}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm lg:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Marketplace activity</p><h2 className="mt-1 text-xl font-extrabold text-[#071d2d]">Properties posted</h2></div><span className="rounded-full bg-[#eef8f6] px-3 py-1.5 text-xs font-bold text-[#087f73]">Last 6 months</span></div>
              <div className="mt-7 flex h-48 items-end gap-3 border-b border-[#e8eef1] px-1">{monthly.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-[#547083]">{value}</span><div className="w-full max-w-10 rounded-t-lg bg-[#0b9f8d] transition-all" style={{ height: `${Math.max((value / maxMonthly) * 82, value ? 10 : 3)}%`, opacity: value ? 1 : 0.25 }} /><span className="text-[10px] font-semibold text-[#8a9aa4]">{new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(new Date().getFullYear(), new Date().getMonth() - 5 + index, 1))}</span></div>)}</div>
              <div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-lg font-extrabold">{metrics.published || 0}</p><p className="text-[10px] font-semibold text-[#71838e]">Published</p></div><div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-lg font-extrabold">{metrics.pendingReview || 0}</p><p className="text-[10px] font-semibold text-[#71838e]">Awaiting review</p></div><div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-lg font-extrabold">{approvalRate}%</p><p className="text-[10px] font-semibold text-[#71838e]">Review approval</p></div></div>
            </section>

            <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm lg:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Lead activity</p><h2 className="mt-1 text-xl font-extrabold text-[#071d2d]">Enquiries</h2></div><MessageSquare className="text-[#087f73]" size={20} /></div>
              <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f1f8f7] p-5"><p className="text-3xl font-extrabold text-[#087f73]">{metrics.totalEnquiries || 0}</p><p className="mt-1 text-xs font-semibold text-[#547083]">Total enquiries</p></div><div className="rounded-2xl bg-[#f7fafb] p-5"><p className="text-3xl font-extrabold text-[#071d2d]">{metrics.newEnquiries || 0}</p><p className="mt-1 text-xs font-semibold text-[#547083]">New / unworked</p></div></div>
              <div className="mt-5 rounded-2xl border border-[#e8eef1] p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#547083]">Review queue</span><span className="text-sm font-extrabold text-[#071d2d]">{metrics.pendingReviews || 0} pending</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2f3]"><div className="h-full rounded-full bg-[#0b9f8d]" style={{ width: `${Math.min((metrics.pendingReviews || 0) / Math.max((metrics.pendingReviews || 0) + (metrics.approvedReviews || 0) + (metrics.rejectedReviews || 0), 1) * 100, 100)}%` }} /></div><p className="mt-2 text-[11px] text-[#71838e]">{metrics.approvedReviews || 0} approved · {metrics.rejectedReviews || 0} rejected</p></div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Latest inventory</p><h2 className="mt-1 text-lg font-extrabold">Recent properties</h2></div><a href="/admin/properties" className="text-xs font-bold text-[#087f73] hover:text-[#065f57]">View queue</a></div><div className="mt-5 divide-y divide-[#edf1f3]">{recentProperties.length === 0 ? <p className="py-5 text-sm text-[#71838e]">No properties yet.</p> : recentProperties.map((property) => <a key={property.id} href={`/properties/${property.id}`} className="block py-3 transition hover:bg-[#f8fbfb]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#193246]">{property.title || "Untitled property"}</p><p className="mt-1 truncate text-[11px] text-[#71838e]">{[property.locality, property.city].filter(Boolean).join(", ") || "Location pending"}</p></div><span className="shrink-0 rounded-full bg-[#f3f7f8] px-2 py-1 text-[10px] font-bold text-[#607889]">{statusLabel(property.status)}</span></div><p className="mt-1 text-[10px] text-[#9aa7ae]">{formatDate(property.created_at)}</p></a>)}</div></section>

            <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Demand side</p><h2 className="mt-1 text-lg font-extrabold">Recent buyer requirements</h2></div><div className="mt-5 divide-y divide-[#edf1f3]">{recentRequirements.length === 0 ? <p className="py-5 text-sm text-[#71838e]">No buyer requirements yet.</p> : recentRequirements.map((requirement) => <div key={requirement.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#193246]">{requirement.preferred_localities?.[0] || requirement.preferred_cities?.[0] || "Any location"}</p><p className="mt-1 text-[11px] text-[#71838e]">{formatMoney(requirement.min_price)} – {formatMoney(requirement.max_price)}</p></div><span className="rounded-full bg-[#eef8f6] px-2 py-1 text-[10px] font-bold text-[#087f73]">{statusLabel(requirement.status)}</span></div><p className="mt-1 text-[10px] text-[#9aa7ae]">{formatDate(requirement.created_at)}</p></div>)}</div></section>

            <section className="rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Latest activity</p><h2 className="mt-1 text-lg font-extrabold">Recent enquiries</h2></div><div className="mt-5 divide-y divide-[#edf1f3]">{recentEnquiries.length === 0 ? <p className="py-5 text-sm text-[#71838e]">No enquiries yet.</p> : recentEnquiries.map((enquiry) => <div key={enquiry.id} className="py-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><MessageSquare size={15} className="text-[#087f73]" /><p className="text-sm font-bold text-[#193246]">Property enquiry</p></div><span className="rounded-full bg-[#f3f7f8] px-2 py-1 text-[10px] font-bold text-[#607889]">{statusLabel(enquiry.status)}</span></div><p className="mt-1 text-[10px] text-[#9aa7ae]">{formatDate(enquiry.created_at)} · {enquiry.property_id.slice(0, 8)}…</p></div>)}</div></section>
          </div>

          <section className="mt-5 rounded-3xl border border-[#dce7eb] bg-white p-6 shadow-sm lg:p-7"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8a9aa4]">Coming with monetization</p><h2 className="mt-1 text-lg font-extrabold">Revenue, site visits & closed deals</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#71838e]">These metrics are intentionally not estimated. UNLIVO does not have transaction or subscription tables yet, so the dashboard will start reporting them as those workflows are introduced.</p></div><div className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f7fafb] px-4 py-3 text-xs font-bold text-[#607889]"><FileText size={16} /> Data model ready to extend</div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-dashed border-[#d7e3e8] p-4"><p className="text-xs font-bold text-[#9aa7ae]">Revenue this month</p><p className="mt-2 text-lg font-extrabold text-[#b0bac0]">Not tracked yet</p></div><div className="rounded-2xl border border-dashed border-[#d7e3e8] p-4"><p className="text-xs font-bold text-[#9aa7ae]">Site visits</p><p className="mt-2 text-lg font-extrabold text-[#b0bac0]">Not tracked yet</p></div><div className="rounded-2xl border border-dashed border-[#d7e3e8] p-4"><p className="text-xs font-bold text-[#9aa7ae]">Deals closed</p><p className="mt-2 text-lg font-extrabold text-[#b0bac0]">Not tracked yet</p></div></div></section>
        </section>
      </div>
    </main>
  );
}

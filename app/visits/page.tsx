"use client";

import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";

export default function VisitsPage() {
  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-6xl py-16 lg:py-20">
        <div className="rounded-3xl border border-[#dfe9ed] bg-white p-10 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">
            UNLIVO property visits
          </p>
          <h1 className="mt-3 text-4xl font-extrabold">My Site Visits</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#687987]">
            Site visit management is being prepared. Your existing property
            enquiry and notification features remain unchanged.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

"use client";

import { CalendarDays, Check, Clock3, Home, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";

const demoVisits = [
  {
    id: "demo-1",
    title: "Sample Property",
    location: "Property location",
    role: "Requested",
    status: "Requested",
    person: "Property owner",
    requested: "Your requested visit time will appear here.",
  },
];

export default function VisitsPage() {
  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-6xl py-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">
              UNLIVO property visits
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">My Site Visits</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687987]">
              Manage your requested and confirmed property visits in one place.
            </p>
          </div>
          <a
            href="/my-properties"
            className="rounded-xl border border-[#cbdde3] bg-white px-4 py-3 text-sm font-bold text-[#123b53]"
          >
            My Properties
          </a>
        </div>

        <div className="mt-8 space-y-5">
          {demoVisits.map((visit) => (
            <article
              key={visit.id}
              className="overflow-hidden rounded-3xl border border-[#dfe9ed] bg-white shadow-sm"
            >
              <div className="border-b border-[#e8eef1] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#315b91]">
                        {visit.role}
                      </span>
                      <span className="rounded-full bg-[#f1f5f7] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#60737e]">
                        {visit.status}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-extrabold">{visit.title}</h2>
                    <p className="mt-1 text-sm text-[#687987]">{visit.location}</p>
                  </div>
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53]"
                  >
                    <Home size={16} /> View property
                  </a>
                </div>
              </div>

              <div className="grid gap-5 p-6 lg:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-[#f7fafb] p-4">
                    <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">
                      Property owner
                    </p>
                    <p className="mt-1 font-extrabold">{visit.person}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f7fafb] p-4">
                    <p className="text-xs font-bold uppercase tracking-[1px] text-[#7b8c97]">
                      Requested time
                    </p>
                    <p className="mt-1 font-extrabold">{visit.requested}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dfe9ed] p-5">
                  <p className="text-sm font-extrabold">Respond to this request</p>
                  <p className="mt-2 text-sm leading-6 text-[#687987]">
                    Once a visit request is loaded from Supabase, the owner will
                    be able to confirm, decline, or propose another time here.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 rounded-xl bg-[#123b53] px-4 py-2.5 text-sm font-bold text-white opacity-50"
                    >
                      <Check size={16} /> Confirm
                    </button>
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 rounded-xl border border-[#efcccc] bg-[#fff7f7] px-4 py-2.5 text-sm font-bold text-[#8b4b4b] opacity-50"
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>

                  <div className="mt-5 border-t border-[#e8eef1] pt-5">
                    <p className="text-sm font-extrabold">Propose another time</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        disabled
                        className="rounded-xl border border-[#d7e3e8] px-3 py-2.5 text-sm opacity-50"
                      />
                      <select
                        disabled
                        defaultValue="09:00"
                        className="rounded-xl border border-[#d7e3e8] bg-white px-3 py-2.5 text-sm opacity-50"
                      >
                        <option value="09:00">9:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] px-4 py-2.5 text-sm font-bold text-[#123b53] opacity-50"
                    >
                      <Clock3 size={16} /> Propose new time
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <div className="rounded-3xl border border-[#dfe9ed] bg-white p-8 text-center shadow-sm">
            <CalendarDays className="mx-auto text-[#0bb89b]" size={38} />
            <h2 className="mt-4 text-xl font-extrabold">Visit workflow ready</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687987]">
              This screen is now ready for the live Supabase visit data in the
              next step.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

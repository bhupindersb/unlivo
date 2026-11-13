import type { ReactNode } from "react";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";

export default function UnlivoInfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f8fa] text-[#102638]">
      <SiteHeader />
      <section className="border-b border-[#dfe9ed] bg-white">
        <div className="container max-w-5xl py-14 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#087f73]">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#5c6e7c]">{intro}</p>
        </div>
      </section>
      <article className="container max-w-5xl py-12 sm:py-16">
        <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm sm:p-10">
          <div className="info-content">{children}</div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";

const markets = {
  mohali: {
    name: "Mohali",
    title: "Property in Mohali",
    description: "Explore residential and commercial property opportunities in Mohali. Browse current UNLIVO listings or tell us what you are looking for and get connected with relevant matches.",
    intro: "Find a property in Mohali with a clearer starting point. Whether you are looking to buy a home, explore a plot or consider a commercial space, UNLIVO helps you describe your needs and connect with relevant property options.",
    availability: "Browse the live UNLIVO search to see the latest approved listings in Mohali. New properties appear as they are reviewed and published.",
    areas: ["Sector 63", "Sector 66", "Sector 69", "Sector 71", "Sector 80", "Sector 82", "Sector 91"],
  },
  chandigarh: {
    name: "Chandigarh",
    title: "Property in Chandigarh",
    description: "Explore property opportunities in Chandigarh. Browse UNLIVO for current listings or post your requirement to be connected when relevant properties become available.",
    intro: "Looking for property in Chandigarh? Start with the location, property type and budget that matter to you. UNLIVO is designed to connect your requirement with relevant property options and the people listing them.",
    availability: "Check the live UNLIVO search for current availability. If you do not find the right property today, post your requirement so relevant property contacts can respond.",
    areas: ["Sector 28", "Sector 34"],
  },
  zirakpur: {
    name: "Zirakpur",
    title: "Property in Zirakpur",
    description: "Explore property in Zirakpur with UNLIVO. Browse current listings, compare available options and post your requirement to find a property that fits your needs.",
    intro: "Searching for property in Zirakpur? Share the type of property, budget and preferred location you have in mind. UNLIVO helps bring relevant listings and property contacts closer to your requirement.",
    availability: "Browse the live UNLIVO search to see the latest approved listings in Zirakpur. New properties appear as they are reviewed and published.",
    areas: [],
  },
  "new-chandigarh": {
    name: "New Chandigarh",
    title: "Property in New Chandigarh",
    description: "Explore property opportunities in New Chandigarh. Tell UNLIVO what you are looking for and connect with relevant property options as listings become available.",
    intro: "Planning to buy or explore property in New Chandigarh? Share your preferred property type, budget and location. UNLIVO helps you express your requirement and connect with relevant property opportunities.",
    availability: "Check the live UNLIVO search for current availability. If you do not find the right property today, post your requirement so relevant property contacts can respond.",
    areas: [],
  },
} as const;

type CitySlug = keyof typeof markets;

export function generateStaticParams() {
  return Object.keys(markets).map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const market = markets[city as CitySlug];
  if (!market) return {};
  return {
    title: market.title,
    description: market.description,
    alternates: { canonical: `/locations/${city}` },
    // Keep all city landing pages out of the index until genuine, approved inventory is available.
    robots: { index: false, follow: true },
    openGraph: { title: market.title, description: market.description, url: `https://www.unlivo.com/locations/${city}` },
  };
}

export default async function CityLandingPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const market = markets[city as CitySlug];
  if (!market) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: market.title,
    description: market.description,
    url: `https://www.unlivo.com/locations/${city}`,
    isPartOf: { "@type": "WebSite", name: "UNLIVO", url: "https://www.unlivo.com" },
    about: { "@type": "Place", name: market.name, address: { "@type": "PostalAddress", addressLocality: market.name, addressCountry: "IN" } },
  };

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <section className="bg-gradient-to-br from-[#eaf8f5] via-white to-[#f1f7fa]">
        <div className="container py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-[#71818c]">
            <Link href="/" className="hover:text-[#087f73]">Home</Link><span className="mx-2">/</span><span>Locations</span><span className="mx-2">/</span><span className="text-[#087f73]">{market.name}</span>
          </nav>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[2.5px] text-[#087f73]">Explore local property opportunities</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-1.5px] sm:text-5xl">{market.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#536575]">{market.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/properties?location=${encodeURIComponent(market.name)}`} className="rounded-xl bg-[#071d2d] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#102f44]">Browse {market.name} Properties</Link>
            <Link href="/post-requirement" className="rounded-xl border border-[#b8c9d1] bg-white px-6 py-3.5 text-sm font-bold text-[#193246] hover:border-[#0bb89b]">Post Your Requirement</Link>
          </div>
        </div>
      </section>
      <section className="container grid gap-8 py-12 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-[#e0e9ed] bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-2xl font-extrabold">Find a property that fits your needs</h2>
          <p className="mt-4 leading-7 text-[#5e6f7d]">{market.description}</p>
          <p className="mt-4 text-sm leading-7 text-[#687987]">{market.availability}</p>
          {market.areas.length > 0 && <><h3 className="mt-8 text-sm font-extrabold uppercase tracking-[1.2px] text-[#547083]">Locations represented in current UNLIVO listings</h3><div className="mt-4 flex flex-wrap gap-2">{market.areas.map((area) => <Link key={area} href={`/properties?location=${encodeURIComponent(area)}`} className="rounded-full border border-[#dfe9ed] bg-[#f8fbfc] px-4 py-2 text-xs font-semibold text-[#365366] hover:border-[#0bb89b] hover:text-[#087f73]">{area}</Link>)}</div></>}
        </div>
        <aside className="rounded-3xl bg-[#071d2d] p-7 text-white sm:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#62d9c1]">A better way to search</p>
          <h2 className="mt-3 text-2xl font-extrabold">Tell us what you need. We’ll help you find your match.</h2>
          <p className="mt-4 text-sm leading-7 text-white/70">Set your budget, choose the property type and tell us which locations work for you. UNLIVO helps connect your requirement with relevant property listings and contacts.</p>
          <Link href="/post-requirement" className="mt-7 inline-flex rounded-xl bg-[#13c6a3] px-5 py-3.5 text-sm font-extrabold text-[#06251f]">Post a Requirement</Link>
        </aside>
      </section>
      <section className="border-y border-[#e3ebee] bg-white">
        <div className="container py-10">
          <h2 className="text-xl font-extrabold">Explore nearby priority markets</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {Object.entries(markets).filter(([slug]) => slug !== city).map(([slug, item]) => <Link key={slug} href={`/locations/${slug}`} className="rounded-xl border border-[#dfe9ed] px-4 py-3 text-sm font-semibold text-[#365366] hover:border-[#0bb89b] hover:text-[#087f73]">{item.name}</Link>)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "About UNLIVO",
  description: "Learn about UNLIVO, a property discovery and buyer-matching platform operated by Beveez Tech.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <UnlivoInfoPage eyebrow="About UNLIVO" title="A more thoughtful way to find property." intro="UNLIVO brings property seekers, owners and real estate brokers together through a marketplace built around clear requirements, relevant discovery and better coordination.">
    <h2>What we do</h2>
    <p>Finding a suitable property can involve scattered listings, repeated conversations and uncertainty about whether an option fits your needs. UNLIVO gives buyers and tenants a place to describe what they are looking for and discover property options that may match. Owners and approved brokers can present listings and manage enquiries through dedicated account tools.</p>
    <h2>How UNLIVO works</h2>
    <ul><li><strong>Share a requirement:</strong> Buyers and tenants can describe their preferred location, property type, budget, size and other preferences.</li><li><strong>Discover relevant options:</strong> UNLIVO uses preference-based Smart Matching to help surface listings that align with the information supplied. A match is a discovery aid, not a recommendation or guarantee.</li><li><strong>Connect and coordinate:</strong> Users can communicate interest and use available enquiry, visit, offer and transaction-workflow features.</li><li><strong>List with an account:</strong> Owners and approved brokers can submit property information. Broker profiles require administrative approval before broker listing access is enabled.</li></ul>
    <h2>Who is behind UNLIVO?</h2>
    <p>UNLIVO is a digital property platform operated by Beveez Tech. Our aim is to make property discovery and coordination more organised and useful for people participating in the real estate market.</p>
    <h2>Our approach</h2>
    <p>We believe useful property discovery starts with understanding what someone actually needs. We aim to make requirements clearer, surface relevant options and provide practical tools for the people involved—while keeping the responsibility for independently checking a property and completing a transaction with the relevant parties.</p>
    <p>Questions or feedback? Contact <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
  </UnlivoInfoPage>;
}

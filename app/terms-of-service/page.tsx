import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the terms governing access to and use of the UNLIVO property discovery platform.",
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsPage() {
  return <UnlivoInfoPage eyebrow="Legal" title="Terms of Service" intro="These terms govern your access to and use of the UNLIVO website, accounts and platform features. By using UNLIVO, you agree to these terms.">
    <p><strong>Last updated: 13 November 2026</strong></p>
    <h2>1. About UNLIVO</h2>
    <p>UNLIVO is a property discovery, listing and buyer-matching platform operated by Beveez Tech (“UNLIVO”, “we”, “us” or “our”). The platform provides digital tools that help users publish property information, share requirements, discover potentially relevant listings and coordinate enquiries and related workflows.</p>
    <h2>2. Eligibility and accounts</h2>
    <p>You must be legally capable of entering into a binding agreement to use the platform. You agree to provide accurate, current information, keep your login credentials confidential and promptly notify us if you suspect unauthorised access. You are responsible for activity carried out through your account, subject to applicable law.</p>
    <h2>3. User responsibilities</h2>
    <ul><li>Provide truthful, lawful and up-to-date account, requirement and property information.</li><li>Only upload content and documents that you are authorised to share.</li><li>Do not impersonate another person, misrepresent your authority, or submit misleading, fraudulent or unlawful listings.</li><li>Do not misuse the platform, interfere with its security or availability, scrape data without permission, or attempt unauthorised access.</li><li>Communicate respectfully and comply with applicable property, consumer, privacy and other laws.</li></ul>
    <h2>4. Property listings and broker approval</h2>
    <p>Users are responsible for the accuracy and completeness of property details, prices, availability, images, ownership or representation claims, approvals and other statements they submit. Broker accounts are subject to profile review and approval before broker listing tools are enabled. Approval of a broker profile is not a title search, property certification, RERA determination or guarantee of any particular listing.</p>
    <h2>5. Smart Matching and search results</h2>
    <p>UNLIVO may use the preferences and details supplied by users to identify and display potentially relevant property options. Matching results are informational and may be incomplete, approximate or affected by the quality and availability of listing data. A match score or explanation is not a valuation, professional recommendation, endorsement or guarantee that a property is suitable.</p>
    <h2>6. Enquiries, offers and transactions</h2>
    <p>Users are responsible for independently communicating, negotiating and verifying all material terms. Any offer, visit, payment arrangement, agreement or property transaction is between the relevant participants. UNLIVO provides workflow tools and does not take ownership of a property, hold earnest money or purchase consideration, act as an escrow agent, or become a party to a transaction merely because the transaction is recorded on the platform. Payment records or uploaded proofs are user-submitted records and do not by themselves confirm that funds have cleared or been received.</p>
    <h2>7. Independent verification</h2>
    <p>Before paying money, signing documents or proceeding with a property, independently verify identity, authority to sell or let, title and encumbrances, approvals, RERA registration where applicable, physical condition, measurements, possession, dues, price, availability and all contractual terms. Obtain advice from qualified legal, financial, tax, technical or real estate professionals as appropriate. UNLIVO does not guarantee title, authenticity, legality, availability, condition, value or performance of any property or user.</p>
    <h2>8. User content and permissions</h2>
    <p>You retain your rights in content you submit. You grant UNLIVO a limited, non-exclusive permission to host, store, reproduce, display and process that content as reasonably necessary to operate, secure and improve the platform and provide the features you request. You confirm that you have the rights and permissions needed to grant this licence. We may remove content that appears unlawful, misleading, infringing or in breach of these terms.</p>
    <h2>9. Platform availability and changes</h2>
    <p>We may modify, suspend or discontinue features, impose reasonable usage limits, or temporarily restrict access for maintenance, security, legal compliance or operational reasons. We aim to keep the platform useful and available but do not promise uninterrupted or error-free service.</p>
    <h2>10. Suspension and termination</h2>
    <p>We may restrict or suspend an account or content where reasonably necessary to protect users, investigate suspected misuse, enforce these terms or comply with law. You may stop using the platform at any time. Certain provisions, including those concerning user responsibilities, content rights, disclaimers and disputes, may continue to apply after use ends.</p>
    <h2>11. Disclaimers and liability</h2>
    <p>To the extent permitted by law, the platform is provided on an “as available” basis. We do not warrant that listings or user-provided information are accurate, complete, current or suitable, or that users will successfully connect or complete a transaction. Nothing in these terms excludes a right or liability that cannot lawfully be excluded. To the extent permitted by law, UNLIVO is not liable for indirect or consequential loss, or for disputes, representations, acts or omissions of users, property owners, brokers or other third parties.</p>
    <h2>12. Privacy</h2>
    <p>Our <a href="/privacy-policy">Privacy Policy</a> explains how information is handled when you use UNLIVO. By using the platform, you acknowledge that policy.</p>
    <h2>13. Changes to these terms</h2>
    <p>We may update these terms from time to time. The revised version will be posted on this page with an updated date. Continued use after the updated terms take effect constitutes acceptance, to the extent permitted by law.</p>
    <h2>14. Governing law and contact</h2>
    <p>These terms are governed by the laws of India, subject to applicable mandatory legal protections. For questions about these terms, contact <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
  </UnlivoInfoPage>;
}

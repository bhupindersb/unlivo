import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "Contact UNLIVO",
  description: "Contact the UNLIVO support team for account, property listing, broker and platform enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <UnlivoInfoPage eyebrow="Contact" title="We're here to help." intro="Have a question about using UNLIVO, your account, a listing or a broker application? Get in touch with our support team.">
    <h2>UNLIVO Support</h2>
    <p>For general support and platform-related enquiries, email us at:</p>
    <p className="text-lg font-bold"><a href="mailto:support@unlivo.com">support@unlivo.com</a></p>
    <h2>To help us assist you</h2>
    <p>Please include the email address registered to your UNLIVO account and a short description of the issue. For a property-related query, include the property reference or relevant listing details where available. Do not email passwords, one-time passcodes or unnecessary sensitive identity or financial information.</p>
    <h2>Business and legal correspondence</h2>
    <p>UNLIVO is operated by Beveez Tech. You may use the support email above for platform, privacy and legal notices, and clearly identify the subject of your message.</p>
  </UnlivoInfoPage>;
}

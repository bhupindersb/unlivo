import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";
import ContactForm from "../../components/contact-form";

export const metadata: Metadata = {
  title: "Contact UNLIVO",
  description: "Contact the UNLIVO support team for account, property listing, broker and platform enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <UnlivoInfoPage eyebrow="Contact" title="We're here to help." intro="Have a question about using UNLIVO, your account, a listing or a broker application? Send our support team a message and we'll get back to you.">
    <div className="grid gap-10 lg:grid-cols-[1.5fr_0.8fr]">
      <section>
        <h2 className="!mt-0">Send us a message</h2>
        <p>Complete the form below. Your message will be sent directly to our support inbox.</p>
        <ContactForm />
      </section>
      <aside className="h-fit rounded-2xl bg-[#f3f8f9] p-6">
        <h2 className="!mt-0">UNLIVO Support</h2>
        <p>Prefer email? You can reach us directly at:</p>
        <p className="text-lg font-bold"><a href="mailto:support@unlivo.com">support@unlivo.com</a></p>
        <h2>Before you send</h2>
        <p>Include your registered account email and, for property-related queries, the property reference or relevant listing details where available.</p>
        <p>Please do not send passwords, one-time passcodes or unnecessary sensitive identity or financial information.</p>
        <h2>Business and legal correspondence</h2>
        <p>UNLIVO is operated by Beveez Tech. You may use the support email for platform, privacy and legal notices, and clearly identify the subject of your message.</p>
      </aside>
    </div>
  </UnlivoInfoPage>;
}

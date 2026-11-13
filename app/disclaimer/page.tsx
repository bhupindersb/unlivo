import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "Property and Platform Disclaimer",
  description: "Important information about UNLIVO listings, Smart Matching and property transactions.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return <UnlivoInfoPage eyebrow="Important information" title="Property & Platform Disclaimer" intro="Please read this information before relying on property listings, matching results or information shared through UNLIVO.">
    <h2>Marketplace information</h2>
    <p>UNLIVO provides technology for property discovery, listing and coordination. Property details, photographs, prices, availability, ownership claims and other listing information may be supplied by users or third parties. We do not represent that every detail has been independently checked.</p>
    <h2>Broker profile approval is not property verification</h2>
    <p>Where a broker profile is approved by UNLIVO, that approval relates to access to broker features. It should not be treated as confirmation of ownership, title, legal authority, credentials beyond the scope of the review, or the accuracy and legal status of any property listing.</p>
    <h2>Smart Matching</h2>
    <p>Smart Matching compares information and preferences provided on the platform to surface potentially relevant options. Results may not include every available property and may not reflect changes or details not supplied to UNLIVO. Users should assess suitability independently.</p>
    <h2>Do your own checks</h2>
    <p>Before making a decision or payment, verify the property, title, encumbrances, approvals, RERA registration where applicable, seller or landlord identity and authority, physical condition, measurements, possession, dues, price and contractual documents. Seek independent professional advice where appropriate.</p>
    <h2>No transaction guarantee</h2>
    <p>UNLIVO does not guarantee that a listing will remain available, that a user will respond, that an offer will be accepted, or that a transaction will be completed. Users are responsible for their own negotiations, due diligence, agreements and payments.</p>
    <p>This disclaimer should be read with our <a href="/terms-of-service">Terms of Service</a>. Questions may be sent to <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
  </UnlivoInfoPage>;
}

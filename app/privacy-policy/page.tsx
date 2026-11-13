import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how UNLIVO handles account, property, requirement and transaction-workflow information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPage() {
  return <UnlivoInfoPage eyebrow="Legal" title="Privacy Policy" intro="This policy describes the information UNLIVO may handle when you visit the website, create an account or use our property discovery and transaction-workflow features.">
    <p><strong>Last updated: 13 November 2026</strong></p>
    <h2>1. Who operates UNLIVO</h2>
    <p>UNLIVO is operated by Beveez Tech (“we”, “us” or “our”). For privacy questions or requests, contact <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
    <h2>2. Information we may collect</h2>
    <ul><li><strong>Account information:</strong> details such as your name, email address, phone number, account role and profile information.</li><li><strong>Property and broker information:</strong> property descriptions, photos, location details, listing information and broker application details that users choose to submit.</li><li><strong>Requirements and interactions:</strong> preferred locations, budgets, property preferences, enquiries, saved properties, visits, offers and related communications or activity.</li><li><strong>Transaction workflow information:</strong> transaction status, payment entries, notes and documents or payment proofs uploaded by participants.</li><li><strong>Technical and usage information:</strong> information that may be generated when the website is used, such as device/browser details, log and diagnostic data, and information needed to maintain sessions and platform security.</li><li><strong>Support correspondence:</strong> information you include when contacting our support team.</li></ul>
    <h2>3. How we use information</h2>
    <p>We use information as reasonably necessary to create and manage accounts; display and manage listings; process requirements; provide preference-based Smart Matching; enable enquiries, visits, offers and transaction workflows; communicate service-related updates; respond to support requests; maintain security and prevent misuse; troubleshoot and improve the platform; and comply with legal obligations.</p>
    <h2>4. Smart Matching</h2>
    <p>Matching uses property and requirement details and preferences supplied to UNLIVO to identify potentially relevant options. The matching feature is designed to support discovery. It does not make a legal, financial or professional decision about a user, property or transaction.</p>
    <h2>5. When information may be shared</h2>
    <p>Depending on the features you use, relevant information may be visible to other users involved in a property interaction—for example, listing details to people browsing the marketplace, or relevant contact and requirement details to a property owner or broker when you submit an enquiry or otherwise choose to connect. Information may also be shared with service providers that help operate, host, secure or support the platform, and where required by law or reasonably necessary to protect rights, users and platform security. We do not describe these disclosures as a sale of your personal information.</p>
    <h2>6. Storage and security</h2>
    <p>We use third-party technology infrastructure to operate the platform and apply reasonable technical and organisational measures intended to protect information. No online service or method of transmission can be guaranteed completely secure. Please protect your credentials and avoid uploading information that is not needed for the feature you are using.</p>
    <h2>7. Retention</h2>
    <p>We retain information for as long as reasonably necessary for the purposes described in this policy, including providing the service, maintaining account and transaction records, resolving disputes, enforcing agreements and meeting legal requirements. Retention periods may vary depending on the type of information and the circumstances.</p>
    <h2>8. Your choices and requests</h2>
    <p>You may contact us to request access to or correction of personal information, raise a privacy concern, or request deletion where applicable. We may need to verify your identity and may retain certain information where required or permitted by law, or where needed for legitimate operational, security or dispute-resolution purposes. Email <a href="mailto:support@unlivo.com?subject=Privacy%20Request">support@unlivo.com</a> with the subject “Privacy Request”.</p>
    <h2>9. Cookies and similar technologies</h2>
    <p>The website may use cookies or similar technologies needed for functions such as account sessions, security and remembering user preferences. Your browser may provide controls for managing cookies; disabling them may affect some website functionality.</p>
    <h2>10. Children</h2>
    <p>UNLIVO is intended for people who are legally able to use the platform and is not directed at children. If you believe a child has provided personal information inappropriately, contact us so we can review the matter.</p>
    <h2>11. Third-party services and links</h2>
    <p>The platform may rely on third-party infrastructure or link to external websites. Those services may have their own privacy terms and practices. We encourage you to review their policies when using them. This policy does not govern third-party websites or services independently operated by others.</p>
    <h2>12. Changes to this policy</h2>
    <p>We may update this policy as the platform or applicable requirements change. The updated policy will be posted here with a revised date.</p>
    <h2>13. Contact</h2>
    <p>For privacy questions and requests, contact <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
  </UnlivoInfoPage>;
}

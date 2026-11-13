import type { Metadata } from "next";
import UnlivoInfoPage from "../../components/unlivo-info-page";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about UNLIVO property search, Smart Matching, buyer requirements, owners and broker accounts.",
  alternates: { canonical: "/faqs" },
};

const faqs = [
  ["What is UNLIVO?", "UNLIVO is a property discovery and matching platform that helps buyers and tenants share requirements and find potentially relevant property listings. Owners and approved brokers can also use the platform to manage listings and enquiries."],
  ["How does Smart Matching work?", "UNLIVO compares details in your requirement—such as location, property type, budget and preferences—with available listing information to surface potentially relevant properties. Matching is a discovery aid, not a guarantee or professional recommendation."],
  ["Is Smart Matching powered by an external AI service?", "UNLIVO's current matching experience uses preference-based matching within the platform. It should not be understood as a guarantee that a property is suitable or as a substitute for your own checks."],
  ["Do I need an account to post a requirement?", "Yes. Posting and managing a requirement is an account feature. Sign in or create an account to use the buyer requirement workflow."],
  ["Can property owners list directly?", "Owners can use the owner/property workflows available in their account. You may be asked to provide property details and complete relevant ownership or representation steps before a listing is published."],
  ["How can a real estate broker join UNLIVO?", "Create an account and submit the broker application. The UNLIVO team reviews broker profiles. Broker listing tools are enabled after approval; submitting an application does not itself mean it has been approved."],
  ["Does broker approval mean a property is legally verified?", "No. Broker profile approval is separate from verification of a particular property's title, ownership, approvals, condition or availability. Users should carry out independent due diligence."],
  ["Are properties or prices guaranteed to be accurate?", "No. Listing information may be supplied by users and can change. Confirm all material details directly with the relevant owner or broker and independently verify documents before proceeding."],
  ["Can I make offers or manage a transaction on UNLIVO?", "Where those features are available for a listing and account, users can use the platform to record offers and coordinate transaction steps. The actual agreement and payment arrangements remain between the relevant parties."],
  ["Does uploading payment proof mean UNLIVO has received my money?", "No. Uploaded payment proofs and payment entries are records supplied by users. They do not mean UNLIVO has received, held, cleared or independently verified the funds."],
  ["How do I contact support?", "Email support@unlivo.com and include your registered account email and a brief description of the issue. Never send your password or one-time passcodes."],
  ["How can I request correction or deletion of my information?", "Email support@unlivo.com with the subject Privacy Request. We may need to verify your identity and may retain some records where required or permitted by law."],
];

export default function FAQsPage() {
  return <UnlivoInfoPage eyebrow="Help centre" title="Frequently Asked Questions" intro="Quick answers about finding properties, sharing requirements, broker approval and using UNLIVO.">
    {faqs.map(([question, answer]) => <section key={question} className="border-b border-[#e5edf0] py-5 last:border-0"><h2 className="!mt-0 !mb-2">{question}</h2><p>{answer}</p></section>)}
    <p className="mt-8">Still need help? Contact <a href="mailto:support@unlivo.com">support@unlivo.com</a>.</p>
  </UnlivoInfoPage>;
}

import type { Metadata } from "next";
import { PageIntro } from "../../components/page-intro";
import { corporateConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for the Capital Hobby Group Ltd corporate website.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const { company, contact } = corporateConfig;
  return (
    <>
      <PageIntro eyebrow="Privacy" title="A simple corporate website." description="How information is handled when you use this website or contact the group." />
      <article className="site-shell legal-copy">
        <h2>About this website</h2>
        <p>This corporate website is operated by {company.legalName}, company number {company.companyNumber}. VAT No. {company.vatNumber}. It does not provide customer accounts, ecommerce checkout, analytics tracking or a marketing mailing list.</p>
        <h2>Technical information</h2>
        <p>Our hosting provider may process basic technical request information needed to deliver, secure and maintain the website. We do not use that information to create customer profiles on this corporate site.</p>
        <h2>Email enquiries</h2>
        <p>If you contact us by email, we use the information you provide to respond to and manage your enquiry. Please do not send payment-card details or unnecessary sensitive information by email.</p>
        <h2>Your enquiry</h2>
        <p>For privacy questions relating to this corporate website, email <a href={`mailto:${contact.informationEmail}`}>{contact.informationEmail}</a>.</p>
      </article>
    </>
  );
}

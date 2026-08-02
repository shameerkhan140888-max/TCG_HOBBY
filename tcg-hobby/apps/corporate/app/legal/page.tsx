import type { Metadata } from "next";
import { PageIntro } from "../../components/page-intro";
import { corporateConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "Legal information",
  description: "Legal and company information for Capital Hobby Group Ltd.",
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  const { company, contact } = corporateConfig;
  return (
    <>
      <PageIntro eyebrow="Legal" title="Company information." description="Confirmed legal details for Capital Hobby Group Ltd and this corporate website." />
      <article className="site-shell legal-copy">
        <h2>Company disclosure</h2>
        <p>{company.legalName} is registered in England and Wales under company number {company.companyNumber}.</p>
        <h2>Registered office</h2>
        <address>{company.registeredOffice.join(", ")}</address>
        <h2>Trading divisions</h2>
        <p>TCG Hobby and Iron Sprue are trading divisions of {company.legalName}. TCG Hobby operates its own customer journey, while Iron Sprue is launching through its public coming-soon site before the full storefront opens.</p>
        <h2>Website enquiries</h2>
        <p>Contact <a href={`mailto:${contact.informationEmail}`}>{contact.informationEmail}</a> about this corporate website.</p>
      </article>
    </>
  );
}

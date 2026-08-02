import type { Metadata } from "next";
import { PageIntro } from "../../components/page-intro";
import { corporateConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Capital Hobby Group Ltd for corporate, supplier, trade and division enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { company, contact, divisions } = corporateConfig;

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Direct your enquiry."
        description="Use the appropriate contact below so your message reaches the right part of Capital Hobby Group."
      />
      <section className="section">
        <div className="site-shell contact-grid">
          <article className="contact-item">
            <p className="eyebrow">General</p>
            <h2>Corporate enquiries</h2>
            <p>For general questions about Capital Hobby Group Ltd and its trading divisions.</p>
            <a className="text-link" href={`mailto:${contact.informationEmail}`}>{contact.informationEmail}</a>
          </article>
          <article className="contact-item">
            <p className="eyebrow">Trade</p>
            <h2>Supplier and accounts enquiries</h2>
            <p>For supplier introductions, trade correspondence and accounts matters.</p>
            <a className="text-link" href={`mailto:${contact.accountsEmail}`}>{contact.accountsEmail}</a>
          </article>
          <article className="contact-item">
            <p className="eyebrow">Trading cards</p>
            <h2>TCG Hobby customers</h2>
            <p>Product, order and customer-support enquiries are handled by the TCG Hobby team.</p>
            <a className="text-link" href={`${divisions.tcgHobby.url}/contact`}>Visit TCG Hobby contact</a>
          </article>
          <article className="contact-item">
            <p className="eyebrow">Modelling</p>
            <h2>Iron Sprue enquiries</h2>
            <p>Iron Sprue is launching soon with a dedicated public landing page for division-specific updates.</p>
            <a className="text-link" href={divisions.ironSprue.url}>Visit Iron Sprue</a>
          </article>
        </div>
      </section>
      <section className="section registered-office" aria-labelledby="office-title">
        <div className="site-shell office-grid">
          <div>
            <p className="eyebrow">Registered office</p>
            <h2 id="office-title">{company.legalName}</h2>
            <p>Company number {company.companyNumber}</p>
          </div>
          <address>
            {company.registeredOffice.map((line) => <span key={line}>{line}</span>)}
          </address>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "../../components/page-intro";
import { corporateConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Capital Hobby Group Ltd and its specialist hobby retail divisions.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const { company } = corporateConfig;

  return (
    <>
      <PageIntro
        eyebrow="About the group"
        title="Focused brands, developed responsibly."
        description="Capital Hobby Group Ltd provides shared commercial and operational direction for specialist hobby retail divisions."
      />
      <section className="section">
        <div className="site-shell editorial-grid">
          <div className="editorial-aside">
            <p className="eyebrow">Our purpose</p>
            <h2>Specialist retail with a clear point of view.</h2>
          </div>
          <div className="prose">
            <p>Capital Hobby Group Ltd was established to develop focused retail brands across specialist hobby markets. Each trading division serves a distinct community while sharing a common approach to product information, service and responsible growth.</p>
            <p>TCG Hobby serves trading-card collectors and players through sealed products and accessories. Iron Sprue is launching soon for modellers and hobbyists seeking model kits, 3D puzzles, display builds, tools and modelling essentials.</p>
            <p>The group supports both divisions with shared commercial direction, operational standards and a long-term approach to supplier and trade relationships.</p>
          </div>
        </div>
      </section>
      <section className="section fact-band" aria-labelledby="company-details-title">
        <div className="site-shell">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Company details</p>
            <h2 id="company-details-title">Registered company information.</h2>
          </div>
          <dl className="company-facts">
            <div><dt>Legal name</dt><dd>{company.legalName}</dd></div>
            <div><dt>Company number</dt><dd>{company.companyNumber}</dd></div>
            <div><dt>Jurisdiction</dt><dd>{company.jurisdiction}</dd></div>
            <div><dt>Registered office</dt><dd><address>{company.registeredOffice.join(", ")}</address></dd></div>
          </dl>
        </div>
      </section>
      <section className="section centred-cta">
        <div className="site-shell">
          <h2>Corporate or trade enquiry?</h2>
          <p>Contact the group and we will direct your enquiry appropriately.</p>
          <Link className="button button-primary" href="/contact">Contact Capital Hobby Group</Link>
        </div>
      </section>
    </>
  );
}

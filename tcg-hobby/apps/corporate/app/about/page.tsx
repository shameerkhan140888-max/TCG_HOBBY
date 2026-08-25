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
        title="Built from the hobbies, not outside them."
        description="Capital Hobby Group Ltd exists to build clear, reliable retail brands for specialist hobby communities."
      />
      <section className="section">
        <div className="site-shell editorial-grid">
          <div className="editorial-aside">
            <p className="eyebrow">Our purpose</p>
            <h2>Practical retail for people who care about the details.</h2>
          </div>
          <div className="prose">
            <p>Capital Hobby Group Ltd was established because specialist hobbies deserve shops that understand why the details matter. The group is shaped by hands-on interest in collecting, building and the small decisions that make a purchase feel dependable.</p>
            <p>TCG Hobby serves trading-card collectors and players through sealed products and accessories. Iron Sprue is launching soon for modellers and hobbyists seeking model kits, 3D puzzles, display builds, tools and workshop essentials.</p>
            <p>Each division keeps its own identity and customer journey, while the group provides shared standards for clear product information, careful supplier relationships, privacy-conscious operations and responsible growth.</p>
          </div>
        </div>
      </section>
      <section className="section fact-band" aria-labelledby="company-details-title">
        <div className="site-shell">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Company details</p>
            <h2 id="company-details-title">Registered company information.</h2>
          </div>
          <dl className="company-facts legal-facts">
            <div><dt>Legal name</dt><dd>{company.legalName}</dd></div>
            <div><dt>Company number</dt><dd>{company.companyNumber}</dd></div>
            <div><dt>VAT No.</dt><dd>{company.vatNumber}</dd></div>
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

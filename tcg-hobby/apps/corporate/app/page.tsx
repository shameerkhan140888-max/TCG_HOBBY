import { corporateConfig } from "../lib/site-config";

const principles = [
  {
    title: "Specialist focus",
    description: "Distinct brands shaped around the communities they serve.",
    icon: "◇",
  },
  {
    title: "Customer care",
    description: "Clear information and considered support.",
    icon: "◎",
  },
  {
    title: "Reliable operations",
    description: "Practical standards across each division.",
    icon: "▣",
  },
  {
    title: "Supplier relationships",
    description: "A long-term, credible approach to trade.",
    icon: "☆",
  },
] as const;

export default function HomePage() {
  const { company, contact, divisions } = corporateConfig;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.legalName,
    url: corporateConfig.siteUrl,
    email: contact.informationEmail,
    identifier: company.companyNumber,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.registeredOffice[0],
      addressLocality: company.registeredOffice[1],
      addressCountry: "GB",
      postalCode: company.registeredOffice[3],
    },
    subOrganization: [
      { "@type": "Organization", name: divisions.tcgHobby.name, url: divisions.tcgHobby.url },
      { "@type": "Organization", name: divisions.ironSprue.name },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <section className="site-shell home-frame" aria-labelledby="home-title" data-testid="corporate-frame">
        <div className="home-primary">
          <div className="corporate-statement">
            <p className="eyebrow">Capital Hobby Group Ltd</p>
            <h1 id="home-title">Parent company for specialist hobby divisions.</h1>
            <p className="statement-tagline">Focused retail brands for distinct hobby communities.</p>
            <p>
              We develop focused UK retail brands with clear identities, dependable operations and a genuine
              understanding of the communities they serve.
            </p>
          </div>

          <div className="division-grid" aria-label="Capital Hobby Group divisions">
            <article className="division-card division-tcg">
              <div className="division-logo division-logo-tcg">
                <img src="/brand/tcg-hobby-horizontal.svg" alt="TCG Hobby" />
              </div>
              <div className="division-content">
                <div className="division-meta">
                  <span>Trading cards</span>
                  <span className="status status-live">Trading</span>
                </div>
                <p>
                  Trading-card products and accessories for collectors and players through a dedicated TCG Hobby customer journey.
                </p>
                <a className="division-cta division-cta-tcg" href={divisions.tcgHobby.url}>
                  Visit TCG Hobby <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>

            <article className="division-card division-sprue">
              <div className="division-logo division-logo-sprue">
                <img src="/brand/iron-sprue-horizontal.svg" alt="Iron Sprue" />
              </div>
              <div className="division-content">
                <div className="division-meta">
                  <span>Modelling and hobby</span>
                  <span className="status status-launching">{divisions.ironSprue.status}</span>
                </div>
                <p>
                  Model kits, 3D puzzles, display builds, workshop tools and modelling essentials.
                </p>
                <a className="division-cta division-cta-sprue" href={divisions.ironSprue.url}>
                  Visit Iron Sprue <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          </div>
        </div>

        <div className="credibility-strip" aria-label="How Capital Hobby Group works">
          {principles.map(({ title, description, icon }) => (
            <article key={title}>
              <span className="credibility-icon" aria-hidden="true">{icon}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

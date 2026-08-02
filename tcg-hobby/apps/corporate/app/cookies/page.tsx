import type { Metadata } from "next";
import { PageIntro } from "../../components/page-intro";
import { corporateConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Cookie information for the Capital Hobby Group Ltd corporate website.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  const { contact } = corporateConfig;
  return (
    <>
      <PageIntro eyebrow="Cookies" title="No marketing tracking on this corporate site." description="How cookies and similar browser storage are handled on the Capital Hobby Group corporate website." />
      <article className="site-shell legal-copy">
        <h2>Current cookie use</h2>
        <p>This corporate website does not provide customer accounts, ecommerce checkout, embedded analytics, advertising pixels or marketing preference tools.</p>
        <h2>Hosting and security</h2>
        <p>Our hosting provider may use essential technical processing to deliver and protect the site. We do not use that information on this corporate site to create customer profiles.</p>
        <h2>Division links</h2>
        <p>Links to TCG Hobby and Iron Sprue take visitors to separate division websites. Those websites publish their own customer and cookie information for their own journeys.</p>
        <h2>Future changes</h2>
        <p>If non-essential analytics or advertising cookies are introduced on this corporate site, we will update this page and add any required consent controls before they run.</p>
        <h2>Contact</h2>
        <p>Questions can be sent to <a href={`mailto:${contact.informationEmail}`}>{contact.informationEmail}</a>.</p>
      </article>
    </>
  );
}

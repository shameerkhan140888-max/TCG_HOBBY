import Link from "next/link";
import { corporateConfig } from "../lib/site-config";

export function SiteFooter() {
  const { company, contact, divisions } = corporateConfig;

  return (
    <footer className="site-shell site-footer">
      <div className="footer-company">
        <p>
          <span>Copyright {new Date().getFullYear()} {company.legalName}</span>
          <span>Company number {company.companyNumber}</span>
          <span>VAT No. {company.vatNumber}</span>
        </p>
        <a href={`mailto:${contact.informationEmail}`}>{contact.informationEmail}</a>
      </div>
      <nav aria-label="Division links">
        <a href={divisions.tcgHobby.url}>TCG Hobby</a>
        <a href={divisions.ironSprue.url}>Iron Sprue</a>
      </nav>
      <nav aria-label="Legal links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/legal">Legal</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}

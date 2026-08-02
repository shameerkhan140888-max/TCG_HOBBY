import Link from "next/link";
import { corporateConfig } from "../lib/site-config";

export function SiteFooter() {
  const { company } = corporateConfig;

  return (
    <footer className="site-shell site-footer">
      <p>
        <span>Copyright {new Date().getFullYear()} {company.legalName}</span>
        <span>Company number {company.companyNumber}</span>
      </p>
      <nav aria-label="Legal links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/legal">Legal</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}

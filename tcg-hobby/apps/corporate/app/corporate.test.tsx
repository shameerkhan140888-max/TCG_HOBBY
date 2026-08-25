import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "../components/site-footer";
import { corporateNavigation } from "../components/site-header";
import { createCorporateConfig } from "../lib/site-config";
import AboutPage from "./about/page";
import ContactPage from "./contact/page";
import CookiesPage from "./cookies/page";
import HomePage from "./page";

describe("corporate site", () => {
  it("renders approved company identity, divisions and legal disclosure", () => {
    const markup = renderToStaticMarkup(<><HomePage /><SiteFooter /></>);
    expect(markup).toContain("Capital Hobby Group Ltd");
    expect(markup).toContain("17336948");
    expect(markup).toContain("VAT No. 525 2040 33");
    expect(markup).toContain("TCG Hobby");
    expect(markup).toContain("Iron Sprue");
    expect(markup).toContain("https://tcg-hobby.co.uk");
    expect(markup).toContain("https://www.ironsprue.co.uk");
    expect(markup).toContain("Launching Soon");
    expect(markup).toContain("Trading");
    expect(markup).not.toContain("Our Brands");
    expect(markup).not.toContain("Website in development");
    expect(markup).not.toContain("In development");
    expect(markup.match(/class="division-card/g)).toHaveLength(2);
    expect(markup.match(/class="credibility-icon"/g)).toHaveLength(4);
    expect(markup).toContain('data-testid="corporate-frame"');
    expect(markup).not.toContain("Explore our divisions");
  });

  it("uses only Home, About and Contact in primary navigation", () => {
    expect(corporateNavigation.map(({ label }) => label)).toEqual(["Home", "About", "Contact"]);
  });

  it("renders factual About, approved Contact details and cookie content", () => {
    const markup = renderToStaticMarkup(<><AboutPage /><ContactPage /><CookiesPage /></>);
    expect(markup).toContain("Built from the hobbies, not outside them.");
    expect(markup).toContain("specialist hobbies deserve shops that understand why the details matter");
    expect(markup).toContain("Registered company information");
    expect(markup).toContain("525 2040 33");
    expect(markup).toContain("legal-facts");
    expect(markup).toContain("4-6 Greatorex Street");
    expect(markup).toContain("info@capitalhobbygroup.co.uk");
    expect(markup).toContain("accounts@capitalhobbygroup.co.uk");
    expect(markup).toContain("No marketing tracking on this corporate site.");
    expect(markup).toContain("does not provide customer accounts");
  });

  it("uses a compact icon-only Corporate favicon and professional footer links", () => {
    const markup = renderToStaticMarkup(<SiteFooter />);
    expect(markup).toContain("info@capitalhobbygroup.co.uk");
    expect(markup).toContain("TCG Hobby");
    expect(markup).toContain("Iron Sprue");
    expect(markup).toContain("/privacy");
    expect(markup).toContain("/cookies");
  });

  it("keeps Iron Sprue marked as launching soon with a public HTTPS destination", () => {
    expect(createCorporateConfig({}).divisions.ironSprue).toMatchObject({
      isLive: false,
      status: "Launching Soon",
      url: "https://www.ironsprue.co.uk",
    });
    expect(createCorporateConfig({ IRON_SPRUE_URL: "https://www.ironsprue.co.uk" }).divisions.ironSprue).toMatchObject({
      isLive: false,
      status: "Launching Soon",
      url: "https://www.ironsprue.co.uk",
    });
  });

  it("rejects localhost and insecure division URLs", () => {
    expect(() => createCorporateConfig({ TCG_HOBBY_URL: "http://localhost:3000" })).toThrow(
      "TCG_HOBBY_URL must be a public HTTPS URL.",
    );
  });
});

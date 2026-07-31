import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "../components/site-footer";
import { corporateNavigation } from "../components/site-header";
import { createCorporateConfig } from "../lib/site-config";
import AboutPage from "./about/page";
import ContactPage from "./contact/page";
import HomePage from "./page";

describe("corporate site", () => {
  it("renders approved company identity, divisions and legal disclosure", () => {
    const markup = renderToStaticMarkup(<><HomePage /><SiteFooter /></>);
    expect(markup).toContain("Capital Hobby Group Ltd");
    expect(markup).toContain("17336948");
    expect(markup).toContain("TCG Hobby");
    expect(markup).toContain("Iron Sprue");
    expect(markup).toContain("https://tcg-hobby.co.uk");
    expect(markup).toContain("Website in development");
    expect(markup).not.toContain("Our Brands");
    expect(markup.match(/class="division-card/g)).toHaveLength(2);
    expect(markup.match(/class="credibility-icon"/g)).toHaveLength(4);
    expect(markup).toContain('data-testid="corporate-frame"');
    expect(markup).not.toContain("Explore our divisions");
  });

  it("uses only Home, About and Contact in primary navigation", () => {
    expect(corporateNavigation.map(({ label }) => label)).toEqual(["Home", "About", "Contact"]);
  });

  it("renders factual About and approved Contact details", () => {
    const markup = renderToStaticMarkup(<><AboutPage /><ContactPage /></>);
    expect(markup).toContain("Registered company information");
    expect(markup).toContain("4-6 Greatorex Street");
    expect(markup).toContain("info@capitalhobbygroup.co.uk");
    expect(markup).toContain("accounts@capitalhobbygroup.co.uk");
  });

  it("keeps Iron Sprue unavailable until a valid HTTPS URL is configured", () => {
    expect(createCorporateConfig({}).divisions.ironSprue).toMatchObject({ isLive: false, url: undefined });
    expect(createCorporateConfig({ IRON_SPRUE_URL: "https://www.ironsprue.co.uk" }).divisions.ironSprue).toMatchObject({
      isLive: true,
      url: "https://www.ironsprue.co.uk",
    });
  });

  it("rejects localhost and insecure division URLs", () => {
    expect(() => createCorporateConfig({ TCG_HOBBY_URL: "http://localhost:3000" })).toThrow(
      "TCG_HOBBY_URL must be a public HTTPS URL.",
    );
  });
});

const DEFAULT_SITE_URL = "https://www.capitalhobbygroup.co.uk";
const DEFAULT_TCG_HOBBY_URL = "https://tcg-hobby.co.uk";
const DEFAULT_IRON_SPRUE_URL = "https://www.ironsprue.co.uk";

type CorporateEnvironment = Readonly<Record<string, string | undefined>> & {
  CORPORATE_SITE_URL?: string;
  TCG_HOBBY_URL?: string;
  IRON_SPRUE_URL?: string;
  CORPORATE_INFO_EMAIL?: string;
  CORPORATE_ACCOUNTS_EMAIL?: string;
};

function requiredHttpsUrl(value: string | undefined, fallback: string, name: string): string {
  const candidate = value?.trim() || fallback;
  const url = new URL(candidate);
  if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost") {
    throw new Error(`${name} must be a public HTTPS URL.`);
  }
  return url.toString().replace(/\/$/, "");
}

function publicEmail(value: string | undefined, fallback: string, name: string): string {
  const candidate = value?.trim() || fallback;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    throw new Error(`${name} must be a valid public email address.`);
  }
  return candidate;
}

export function createCorporateConfig(environment: CorporateEnvironment = process.env) {
  const ironSprueUrl = requiredHttpsUrl(
    environment.IRON_SPRUE_URL,
    DEFAULT_IRON_SPRUE_URL,
    "IRON_SPRUE_URL",
  );

  return Object.freeze({
    company: Object.freeze({
      legalName: "Capital Hobby Group Ltd",
      companyNumber: "17336948",
      vatNumber: "525 2040 33",
      jurisdiction: "Registered in England and Wales",
      registeredOffice: Object.freeze([
        "4-6 Greatorex Street",
        "London",
        "United Kingdom",
        "E1 5NF",
      ]),
    }),
    contact: Object.freeze({
      informationEmail: publicEmail(
        environment.CORPORATE_INFO_EMAIL,
        "info@capitalhobbygroup.co.uk",
        "CORPORATE_INFO_EMAIL",
      ),
      accountsEmail: publicEmail(
        environment.CORPORATE_ACCOUNTS_EMAIL,
        "accounts@capitalhobbygroup.co.uk",
        "CORPORATE_ACCOUNTS_EMAIL",
      ),
    }),
    siteUrl: requiredHttpsUrl(environment.CORPORATE_SITE_URL, DEFAULT_SITE_URL, "CORPORATE_SITE_URL"),
    divisions: Object.freeze({
      tcgHobby: Object.freeze({
        name: "TCG Hobby",
        url: requiredHttpsUrl(environment.TCG_HOBBY_URL, DEFAULT_TCG_HOBBY_URL, "TCG_HOBBY_URL"),
      }),
      ironSprue: Object.freeze({
        name: "Iron Sprue",
        url: ironSprueUrl,
        status: "Launching Soon",
        isLive: false,
      }),
    }),
  });
}

export const corporateConfig = createCorporateConfig();

import type { MetadataRoute } from "next";
import { corporateConfig } from "../lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${corporateConfig.siteUrl}/sitemap.xml`,
  };
}

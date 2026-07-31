import type { MetadataRoute } from "next";
import { corporateConfig } from "../lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/contact", "/privacy", "/legal"].map((path) => ({
    url: `${corporateConfig.siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "monthly" : "yearly",
    priority: path === "/" ? 1 : path === "/about" || path === "/contact" ? 0.8 : 0.4,
  }));
}

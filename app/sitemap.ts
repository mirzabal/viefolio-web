import type { MetadataRoute } from "next";

const SITE = "https://viefolio.com";

/* Marketing and legal surfaces only. Individual portfolios live on their own
   subdomains, each of which serves its own sitemap — listing them here would
   claim they belong to this host. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

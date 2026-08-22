import type { MetadataRoute } from "next";

const SITE = "https://viefolio.com";

/* Marketing, legal and directory surfaces only. Published portfolios live on
   their own hosts and each serves its own sitemap and robots.txt from
   app/portfolio/[domain]/seo/ — listing them here would claim they belong to
   this host.

   /login is deliberately absent: it carries `noindex`, and a noindex page in
   a sitemap is a contradiction Search Console reports as an error.

   No `lastModified` anywhere. It used to be `new Date()` on every entry, which
   is a lie twice over: this file is prerendered, so every page would have
   claimed the deploy timestamp, and /explore changes when somebody opts in —
   between deploys, with no build to update. Google only trusts lastmod when a
   site is consistently accurate about it, and treats it as noise otherwise, so
   omitting it is strictly better than guessing. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/explore`, changeFrequency: "daily", priority: 0.8 },
    ...["developers", "designers", "creators", "students"].map(slug => ({
      url: `${SITE}/explore/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${SITE}/support`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}

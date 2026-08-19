import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in surfaces and auth callbacks have nothing to index, and
        // /reset carries a single-use token in the query string.
        disallow: ["/dashboard", "/login", "/reset", "/api/"],
      },
    ],
    sitemap: "https://viefolio.com/sitemap.xml",
    host: "https://viefolio.com",
  };
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // SAMEORIGIN (not DENY) so future in-app embeds keep working
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // Generated OG cards change only when the profile does; a day at the
        // edge keeps the crawler from re-rendering them on every share.
        source: "/:path*/opengraph-image",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=3600" }],
      },
    ];
  },
};

export default nextConfig;

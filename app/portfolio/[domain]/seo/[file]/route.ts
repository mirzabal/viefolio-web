/* Per-host robots.txt and sitemap.xml for published portfolios.

   These can't live at app/portfolio/[domain]/robots.txt/route.ts: `robots.txt`
   and `sitemap.xml` are reserved metadata-file conventions in Next, so a route
   segment by those names is listed in the build output but never resolves.
   proxy.ts rewrites the real paths onto this one instead. */

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/portfolio-df758/databases/(default)/documents";

async function profileExists(username: string): Promise<boolean> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "profiles" }],
          where: { fieldFilter: { field: { fieldPath: "username" }, op: "EQUAL", value: { stringValue: username } } },
          limit: 1,
        },
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.[0]?.document);
  } catch {
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string; file: string }> }) {
  const { domain, file } = await params;
  const origin = `https://${domain}.viefolio.com`;

  if (file === "robots") {
    // No profile lookup here: a robots.txt must answer even for a handle that
    // doesn't exist, and an unclaimed one has nothing to disallow anyway.
    const body = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\nHost: ${origin}\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  if (file === "sitemap") {
    // An unclaimed handle serves a 404 page; advertising it would send the
    // crawler straight to a soft 404.
    if (!(await profileExists(domain))) {
      return new Response("Not found", { status: 404 });
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
    return new Response(body, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}

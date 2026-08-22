#!/usr/bin/env node
/* Local SEO smoke test. Run the production server, then:
 *   node scripts/seo-check.mjs
 *   node scripts/seo-check.mjs http://localhost:3000
 *
 * Checks what a crawler actually receives — the served HTML, not the React
 * tree. No dependencies: fetch and regex are enough for meta tags, and adding
 * a parser for ten fields is not worth the install. */

const BASE = process.argv[2] ?? "http://localhost:3000";
const SITE = "https://viefolio.com";

const PAGES = [
  { path: "/", expect: { indexable: true } },
  { path: "/explore", expect: { indexable: true } },
  { path: "/explore/developers", expect: { indexable: true } },
  { path: "/support", expect: { indexable: true } },
  { path: "/privacy", expect: { indexable: true } },
  { path: "/terms", expect: { indexable: true } },
  { path: "/login", expect: { indexable: false } },
];

const pass = [];
const warn = [];
const fail = [];

const ok = (m) => pass.push(m);
const wrn = (m) => warn.push(m);
const bad = (m) => fail.push(m);

const pick = (html, re) => (html.match(re) ?? [])[1] ?? null;

const meta = (html, name) =>
  pick(html, new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, "i")) ??
  pick(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${name}"`, "i"));

const og = (html, prop) =>
  pick(html, new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, "i")) ??
  pick(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${prop}"`, "i"));

const decode = (s) =>
  s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function checkPage({ path, expect }) {
  let res, html;
  try {
    res = await fetch(BASE + path, { redirect: "manual" });
    html = await res.text();
  } catch (e) {
    bad(`${path} — sunucuya ulaşılamadı (${e.message})`);
    return;
  }

  if (res.status !== 200) {
    bad(`${path} — HTTP ${res.status}`);
    return;
  }

  // Title
  const title = decode(pick(html, /<title>([^<]*)<\/title>/i));
  if (!title) bad(`${path} — <title> yok`);
  else if (title.length > 60) wrn(`${path} — title ${title.length} karakter (SERP'te kırpılır, ≤60 ideal): "${title}"`);
  else ok(`${path} — title (${title.length}): "${title}"`);

  // Description
  const desc = decode(meta(html, "description"));
  if (!desc) bad(`${path} — meta description yok`);
  else if (desc.length < 50) wrn(`${path} — description çok kısa (${desc.length})`);
  else if (desc.length > 160) wrn(`${path} — description ${desc.length} karakter (kırpılır, ≤160 ideal)`);
  else ok(`${path} — description (${desc.length})`);

  // Canonical
  const canonical = pick(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
  if (!canonical) bad(`${path} — canonical yok`);
  else if (!canonical.startsWith("http")) bad(`${path} — canonical mutlak değil: ${canonical}`);
  else {
    const want = path === "/" ? SITE : SITE + path;
    if (canonical.replace(/\/$/, "") !== want.replace(/\/$/, "")) {
      bad(`${path} — canonical yanlış sayfayı gösteriyor: ${canonical}`);
    } else ok(`${path} — canonical ${canonical}`);
  }

  // robots
  const robots = (meta(html, "robots") ?? "").toLowerCase();
  const noindex = robots.includes("noindex");
  if (expect.indexable && noindex) bad(`${path} — indekslenmeli ama noindex var`);
  else if (!expect.indexable && !noindex) bad(`${path} — noindex olmalı ama indekslenebilir`);
  else ok(`${path} — robots "${robots || "(varsayılan: index)"}"`);

  // Open Graph
  for (const p of ["og:title", "og:description", "og:image", "og:url"]) {
    if (!og(html, p)) wrn(`${path} — ${p} yok`);
  }
  const image = og(html, "og:image");
  if (image) {
    const abs = image.startsWith("http") ? image : BASE + image;
    try {
      const r = await fetch(abs.replace(SITE, BASE), { method: "GET" });
      const type = r.headers.get("content-type") ?? "";
      if (!r.ok) bad(`${path} — og:image ${r.status} dönüyor`);
      else if (!type.startsWith("image/")) bad(`${path} — og:image image değil (${type})`);
      else ok(`${path} — og:image ${type}`);
    } catch {
      wrn(`${path} — og:image çekilemedi`);
    }
  }
  if (!meta(html, "twitter:card")) wrn(`${path} — twitter:card yok`);

  // Exactly one h1
  const h1s = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1s === 0) bad(`${path} — h1 yok`);
  else if (h1s > 1) wrn(`${path} — ${h1s} adet h1 (bir tane olmalı)`);
  else ok(`${path} — tek h1`);

  // lang
  if (!/<html[^>]+lang="/i.test(html)) bad(`${path} — <html lang> yok`);

  // JSON-LD
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw);
      const types = (parsed["@graph"] ?? [parsed]).map(n => n["@type"]).join(", ");
      ok(`${path} — JSON-LD geçerli (${types})`);
    } catch {
      bad(`${path} — JSON-LD parse edilemiyor`);
    }
  }
}

async function checkRobots() {
  const res = await fetch(`${BASE}/robots.txt`);
  if (!res.ok) return bad(`/robots.txt — HTTP ${res.status}`);
  const body = await res.text();
  if (!/^sitemap:/im.test(body)) bad("/robots.txt — Sitemap satırı yok");
  else ok("/robots.txt — Sitemap satırı var");
  for (const p of ["/dashboard", "/login", "/api/"]) {
    if (!body.includes(`Disallow: ${p}`)) wrn(`/robots.txt — ${p} disallow edilmemiş`);
  }
  ok("/robots.txt — servis ediliyor");
}

async function checkSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) return bad(`/sitemap.xml — HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (locs.length === 0) return bad("/sitemap.xml — hiç <loc> yok");
  ok(`/sitemap.xml — ${locs.length} URL`);

  if (/<lastmod>/.test(xml)) {
    wrn("/sitemap.xml — lastmod var; doğruluğundan emin değilsen kaldır, yanlış lastmod hiç yoktan kötü");
  }

  // Every listed URL must actually resolve, and must not be noindex
  for (const loc of locs) {
    const local = loc.replace(SITE, BASE);
    const r = await fetch(local, { redirect: "manual" });
    if (r.status !== 200) {
      bad(`sitemap → ${loc} — HTTP ${r.status}`);
      continue;
    }
    const html = await r.text();
    if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) {
      bad(`sitemap → ${loc} — sitemap'te ama noindex (çelişki)`);
    }
  }
  ok("sitemap'teki tüm URL'ler 200 dönüyor");
}

async function main() {
  console.log(`\nSEO kontrolü → ${BASE}\n${"─".repeat(60)}`);
  for (const p of PAGES) await checkPage(p);
  await checkRobots();
  await checkSitemap();

  const line = (icon, list) => list.forEach(m => console.log(`${icon} ${m}`));
  console.log();
  line("✗", fail);
  line("!", warn);
  if (process.env.VERBOSE) line("✓", pass);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${pass.length} geçti · ${warn.length} uyarı · ${fail.length} hata`);
  console.log("Tüm geçenleri görmek için: VERBOSE=1 node scripts/seo-check.mjs\n");
  process.exit(fail.length ? 1 : 0);
}

main();

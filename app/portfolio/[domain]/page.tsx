/* ─── Public Portfolio Page ──────────────────────────── */

import { cache } from "react";
import type { Metadata } from "next";
import PortfolioView from "@/components/PortfolioView";
import VisitTracker from "@/components/VisitTracker";
import status from "@/app/status.module.css";
import pv from "./portfolio.module.css";


const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/portfolio-df758/databases/(default)/documents";

/* ─── Types ──────────────────────────────────────────── */
interface FirestoreValue { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; arrayValue?: { values?: FirestoreValue[] }; mapValue?: { fields?: Record<string, FirestoreValue> }; }
interface FirestoreDoc { name: string; fields: Record<string, FirestoreValue>; }

import type {
  Project,
  Profile,
  SocialLink,
} from "@/types/portfolio";
import { DEFAULT_THEME, DEFAULT_ACCENT } from "@/types/portfolio";
import type { Theme, SocialLinksLayout, UserInfoLayout } from "@/types/portfolio";

/* ─── Firestore helpers ──────────────────────────────── */
function fStr(doc: FirestoreDoc, key: string): string { return doc.fields?.[key]?.stringValue ?? ""; }
function fBool(doc: FirestoreDoc, key: string): boolean { return doc.fields?.[key]?.booleanValue ?? false; }
function fArr(doc: FirestoreDoc, key: string): FirestoreValue[] { return doc.fields?.[key]?.arrayValue?.values ?? []; }
function fNum(doc: FirestoreDoc, key: string): number { return Number(doc.fields?.[key]?.integerValue ?? doc.fields?.[key]?.doubleValue ?? 0); }
function fMapStr(v: FirestoreValue, key: string): string { return v.mapValue?.fields?.[key]?.stringValue ?? ""; }
function fMapNum(v: FirestoreValue, key: string): number { return Number(v.mapValue?.fields?.[key]?.integerValue ?? v.mapValue?.fields?.[key]?.doubleValue ?? 0); }
function fMapBool(v: FirestoreValue, key: string): boolean { return v.mapValue?.fields?.[key]?.booleanValue ?? false; }
function docId(doc: FirestoreDoc): string { const parts = doc.name.split("/"); return parts[parts.length - 1]; }

/* ─── Data fetching ──────────────────────────────────── */
// cache() memoizes per request so generateMetadata + the page share one Firestore query
const fetchProfile = cache(async function fetchProfile(username: string): Promise<(Profile & { userId: string }) | null> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "profiles" }], where: { fieldFilter: { field: { fieldPath: "username" }, op: "EQUAL", value: { stringValue: username } } }, limit: 1 } }),
    next: { revalidate: 30 },
  });
  // Distinguish backend outage (→ error boundary, retry) from a genuinely
  // unknown username (→ NotFound page)
  if (!res.ok) throw new Error(`Firestore profiles query failed: ${res.status}`);
  const data = await res.json();
  const doc = data?.[0]?.document as FirestoreDoc | undefined;
  if (!doc) return null;
  // Migrate socialLinks: new format is array, legacy is map {github, linkedin, twitter}
  const rawSocialLinks = doc.fields?.socialLinks?.arrayValue?.values;
  const sl = doc.fields?.socialLinks?.mapValue?.fields;
  let migratedSocialLinks: SocialLink[] = [];
  if (rawSocialLinks && rawSocialLinks.length > 0) {
    migratedSocialLinks = rawSocialLinks.map(v => ({
      id: fMapStr(v, 'id') || crypto.randomUUID(),
      type: (fMapStr(v, 'type') || 'CUSTOM') as SocialLink['type'],
      title: fMapStr(v, 'title'),
      url: fMapStr(v, 'url'),
      imageUrl: fMapStr(v, 'imageUrl'),
      visible: v.mapValue?.fields?.visible?.booleanValue ?? true,
    }));
  } else if (sl) {
    if (sl.github?.stringValue) migratedSocialLinks.push({ id: crypto.randomUUID(), type: 'GITHUB', title: 'GitHub', url: sl.github.stringValue, visible: true });
    if (sl.linkedin?.stringValue) migratedSocialLinks.push({ id: crypto.randomUUID(), type: 'LINKEDIN', title: 'LinkedIn', url: sl.linkedin.stringValue, visible: true });
    if (sl.twitter?.stringValue) migratedSocialLinks.push({ id: crypto.randomUUID(), type: 'TWITTER', title: 'Twitter', url: sl.twitter.stringValue, visible: true });
  }
  // Migrate legacy themeColor → theme
  const rawTheme = doc.fields?.theme?.mapValue?.fields;
  const legacyAccent = fStr(doc, "themeColor") || DEFAULT_ACCENT;
  const colorFields = rawTheme?.colors?.mapValue?.fields;
  const legacyCard = colorFields?.card?.stringValue ?? colorFields?.projectCard?.stringValue ?? DEFAULT_THEME.colors.card;
  // 'SOFT' was removed with the old lavender palette — fold it into MINIMAL.
  const storedPreset = rawTheme?.preset?.stringValue;
  const migratedTheme: Theme = rawTheme ? {
    preset: (storedPreset === 'SOFT' ? 'MINIMAL' : storedPreset as Theme['preset']) ?? 'MINIMAL',
    colors: {
      background: colorFields?.background?.stringValue ?? DEFAULT_THEME.colors.background,
      card: legacyCard,
      accent: colorFields?.accent?.stringValue ?? legacyAccent,
      text: colorFields?.text?.stringValue ?? DEFAULT_THEME.colors.text,
      descriptionColor: colorFields?.descriptionColor?.stringValue ?? DEFAULT_THEME.colors.descriptionColor,
    },
    texture: (rawTheme?.texture?.stringValue as Theme['texture']) ?? 'NONE',
    fontFamily: rawTheme?.fontFamily?.stringValue as Theme['fontFamily'] | undefined,
    cardStyle: rawTheme?.cardStyle?.stringValue as Theme['cardStyle'] | undefined,
    buttonStyle: rawTheme?.buttonStyle?.stringValue as Theme['buttonStyle'] | undefined,
  } : { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors, accent: legacyAccent } };
  return {
    fullName: fStr(doc, "fullName"), title: fStr(doc, "title"), bio: fStr(doc, "bio"),
    location: fStr(doc, "location"), username: fStr(doc, "username"), avatarUrl: fStr(doc, "avatarUrl"),
    showAvatar: fBool(doc, "showAvatar") || (doc.fields?.showAvatar === undefined),
    theme: migratedTheme,
    socialLinks: migratedSocialLinks,
    socialLinksLayout: (fStr(doc, "socialLinksLayout") as SocialLinksLayout) || 'ICONS',
    userInfoLayout: (fStr(doc, "userInfoLayout") as UserInfoLayout) || 'LEFT',
    // Missing field must mean visible — fBool would coerce absent to false
    showLinks: doc.fields?.showLinks?.booleanValue ?? true,
    showProjects: doc.fields?.showProjects?.booleanValue ?? true,
    showSkills: doc.fields?.showSkills?.booleanValue ?? true,
    portfolioVisibility: (fStr(doc, "portfolioVisibility") as Profile["portfolioVisibility"]) || "ALL",
    layoutStyle: fStr(doc, "layoutStyle") === 'LINK_IN_BIO' ? 'CLASSIC' : ((fStr(doc, "layoutStyle") as Profile["layoutStyle"]) || "CLASSIC"),
    accountType: (fStr(doc, "accountType") as Profile["accountType"]) || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skills: fArr(doc, "skills").map((v: any) => ({ id: fMapStr(v, "id") || crypto.randomUUID(), name: fMapStr(v, "name"), level: fMapNum(v, "level") || 50, visible: v.mapValue?.fields?.visible?.booleanValue ?? true })),
    userId: fStr(doc, "userId"),
    // Absent means "created before verification existed" — grandfathered as
    // verified. Only an explicit false hides the portfolio.
    emailVerified: doc.fields?.emailVerified?.booleanValue ?? true,
  };
});

/* ─── Metadata ───────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  const profile = await fetchProfile(domain);
  const url = `https://${domain}.viefolio.com`;

  if (!profile || !profile.emailVerified) {
    return { title: "Portfolio not found", robots: { index: false, follow: false } };
  }

  const name = profile.fullName || domain;
  const title = profile.title ? `${name} — ${profile.title}` : `${name} — Portfolio`;
  const description =
    profile.bio ||
    `${name}${profile.title ? `, ${profile.title}` : ""}${profile.location ? ` in ${profile.location}` : ""}. Portfolio built with Viefolio.`;

  return {
    metadataBase: new URL(url),
    title: { absolute: title },
    description,
    // Each portfolio is its own site; the template and canonical from the
    // root layout would otherwise point every one of them at viefolio.com.
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      siteName: name,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function fetchProjects(userId: string): Promise<Project[]> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "projects" }], where: { fieldFilter: { field: { fieldPath: "userId" }, op: "EQUAL", value: { stringValue: userId } } } } }),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Firestore projects query failed: ${res.status}`);
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).filter((r: any) => r.document).map((r: any) => {
    const doc = r.document as FirestoreDoc;
    const rawStatus = (fStr(doc, "status") || "IN_PROGRESS").toUpperCase();
    return {
      id: docId(doc),
      title: fStr(doc, "title") || fStr(doc, "name") || "Untitled",
      description: fStr(doc, "description"),
      status: rawStatus === "COMPLETED" ? "RELEASED" : rawStatus,
      imageUrl: fStr(doc, "imageUrl"),
      imageUrls: fArr(doc, "imageUrls").map(v => v.stringValue ?? "").filter(Boolean),
      showImage: fBool(doc, "showImage"),
      icon: fStr(doc, "icon") || "Code",
      projectType: (fStr(doc, "projectType") || "SOLO") as Project["projectType"],
      startDate: fStr(doc, "startDate") || "",
      endDate: fStr(doc, "endDate") || "",
      techStack: fArr(doc, "techStack").map(v => ({ technologyName: fMapStr(v, "technologyName") || fMapStr(v, "name") })),
      checkpoints: fArr(doc, "checkpoints").map((v, i) => ({ title: fMapStr(v, "title"), percentage: fMapNum(v, "percentage"), isCompleted: fMapBool(v, "isCompleted"), orderIndex: fMapNum(v, "orderIndex") || i })).sort((a, b) => a.orderIndex - b.orderIndex),
      links: fArr(doc, "links").map(v => ({ type: fMapStr(v, "type"), url: fMapStr(v, "url") || fMapStr(v, "link") })),
      orderIndex: fNum(doc, "orderIndex"),
      visible: doc.fields?.visible?.booleanValue ?? true,
    };
  }).sort((a: Project, b: Project) => (a.orderIndex || 0) - (b.orderIndex || 0));
}

/* ─── 404 Component ──────────────────────────────────── */
function NotFound({ domain }: { domain: string }) {
  return (
    <main className={status.page}>
      <div className={status.card}>
        <img src="/logo.svg" alt="" aria-hidden="true" className={status.mark} />
        <span className={status.code}>Not here yet</span>
        <h1>This portfolio doesn&rsquo;t exist</h1>
        <p>
          Nobody has claimed <span className={status.handle}>{domain}.viefolio.com</span> so far.
          It could be yours.
        </p>
        <div className={status.actions}>
          <a href="https://viefolio.com/login" className="btn btn--primary btn--lg">
            Claim this address
          </a>
          <a href="https://viefolio.com" className="btn btn--outline btn--lg">
            What is Viefolio?
          </a>
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default async function PortfolioPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const profileData = await fetchProfile(domain);
  if (!profileData || !profileData.emailVerified) return <NotFound domain={domain} />;

  const { userId, ...profile } = profileData;
  let projects = await fetchProjects(userId);

  // Apply visibility filters
  projects = projects.filter(p => p.visible !== false);
  if (profile.portfolioVisibility === "RELEASED_ONLY") {
    projects = projects.filter(p => p.status === "RELEASED" || p.status === "COMPLETED");
  }

  const color = profile.theme.colors.accent;
  const url = `https://${domain}.viefolio.com`;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.fullName || domain,
      url,
      ...(profile.title ? { jobTitle: profile.title } : {}),
      ...(profile.bio ? { description: profile.bio } : {}),
      ...(profile.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location } } : {}),
      ...(profile.avatarUrl && profile.showAvatar ? { image: profile.avatarUrl } : {}),
      ...(profile.socialLinks?.length
        ? { sameAs: profile.socialLinks.filter(l => l.visible !== false && l.url).map(l => l.url) }
        : {}),
      ...(projects.length
        ? {
            subjectOf: projects.slice(0, 12).map(pr => ({
              "@type": "CreativeWork",
              name: pr.title,
              ...(pr.description ? { description: pr.description } : {}),
            })),
          }
        : {}),
    },
    isPartOf: { "@type": "WebSite", name: "Viefolio", url: "https://viefolio.com" },
  };

  return (
    <div className={pv.page} style={{ backgroundColor: profile.theme.colors.background }}>
      <VisitTracker ownerUid={userId} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <nav
        className={pv.bar}
        style={{ backgroundColor: `${profile.theme.colors.background}cc`, borderColor: `${color}26` }}
      >
        <div className={pv.barInner}>
          <span className={pv.who} style={{ color: profile.theme.colors.text }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" aria-hidden="true" />
            {profile.fullName || domain}
          </span>
          <a href="https://viefolio.com" className={pv.credit} style={{ color }}>
            Built with Viefolio
          </a>
        </div>
      </nav>

      <main className={pv.main}>
        <PortfolioView profile={profile} projects={projects} skills={profile.skills} />
      </main>

      <footer className={pv.footer} style={{ borderColor: `${color}26` }}>
        <div className={pv.barInner}>
          <span className={pv.credit} style={{ color: `${profile.theme.colors.text}99` }}>
            Powered by{" "}
            <a href="https://viefolio.com" style={{ color, fontWeight: 700 }}>
              Viefolio
            </a>
          </span>
          <span className={pv.handle} style={{ color: `${profile.theme.colors.text}66` }}>
            {domain}.viefolio.com
          </span>
        </div>
      </footer>
    </div>
  );
}

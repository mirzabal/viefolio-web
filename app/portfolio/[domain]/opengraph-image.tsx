import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, montserratFonts } from "@/lib/og";

export const alt = "Portfolio on Viefolio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/portfolio-df758/databases/(default)/documents";

/* Only the handful of fields the card draws. The page component's fetch is
   request-memoised for the page render; an image is a separate request, so
   sharing it would buy nothing and couple two very different shapes. */
async function fetchCardData(username: string) {
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
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const f = data?.[0]?.document?.fields;
    if (!f) return null;
    return {
      name: f.fullName?.stringValue || username,
      role: f.title?.stringValue || "",
      bio: f.bio?.stringValue || "",
      location: f.location?.stringValue || "",
      avatar: f.showAvatar?.booleanValue === false ? "" : f.avatarUrl?.stringValue || "",
      accent: f.theme?.mapValue?.fields?.colors?.mapValue?.fields?.accent?.stringValue || f.themeColor?.stringValue || "#013e37",
    };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { domain: string } }) {
  const { domain } = params;
  const p = await fetchCardData(domain);
  const name = p?.name ?? domain;
  const role = p?.role ?? "Portfolio";
  const accent = p?.accent ?? "#013e37";
  const fonts = await montserratFonts();

  const PAPER = "#fdfbf3";
  const INK = "#013e37";
  const INK_2 = "#33605a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: 72,
          fontFamily: fonts ? "Montserrat" : "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bar picks up the owner's theme colour */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: accent, display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {p?.avatar ? (
             
            <img src={p.avatar} alt="" width={148} height={148} style={{ borderRadius: 36, objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 148,
                height: 148,
                borderRadius: 36,
                background: accent,
                color: PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 68,
                fontWeight: 800,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 68, fontWeight: 800, color: INK, letterSpacing: -2.5, lineHeight: 1.05, display: "flex" }}>
              {name}
            </div>
            {role ? <div style={{ fontSize: 34, color: INK_2, display: "flex" }}>{role}</div> : null}
          </div>
        </div>

        {p?.bio ? (
          <div style={{ fontSize: 30, color: INK_2, maxWidth: 1000, lineHeight: 1.45, display: "flex" }}>
            {p.bio.length > 160 ? `${p.bio.slice(0, 157)}…` : p.bio}
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 999,
              background: INK,
              color: "#ffefb3",
              fontSize: 26,
              fontWeight: 700,
              display: "flex",
            }}
          >
            {domain}.viefolio.com
          </div>
          <div style={{ fontSize: 24, color: INK_2, display: "flex" }}>Built with Viefolio</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

/* Shared bits for the dynamic Open Graph images. */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const PAPER = "#fdfbf3";
export const BUTTER = "#ffefb3";
export const INK = "#013e37";
export const INK_2 = "#33605a";

/* next/og needs the font as bytes. Google's CSS endpoint hands back a URL for
   the actual file, so it's two hops. Cached for a week; if either hop fails the
   image still renders in the fallback face rather than 500-ing. */
export async function loadMontserrat(weight: 400 | 700 | 800, text?: string) {
  try {
    const params = new URLSearchParams({ family: `Montserrat:wght@${weight}` });
    if (text) params.set("text", text);
    const cssRes = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
      headers: {
        // Ask for the TTF branch; woff2 is not decodable by next/og.
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.20.25",
      },
      next: { revalidate: 604800 },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url, { next: { revalidate: 604800 } });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export async function montserratFonts(text?: string) {
  const [regular, bold] = await Promise.all([loadMontserrat(400, text), loadMontserrat(800, text)]);
  const fonts = [];
  if (regular) fonts.push({ name: "Montserrat", data: regular, weight: 400 as const, style: "normal" as const });
  if (bold) fonts.push({ name: "Montserrat", data: bold, weight: 800 as const, style: "normal" as const });
  return fonts.length ? fonts : undefined;
}

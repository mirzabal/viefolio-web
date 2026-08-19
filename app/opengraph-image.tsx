import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, PAPER, BUTTER, INK, INK_2, montserratFonts } from "@/lib/og";

export const alt = "Viefolio — Your work deserves a beautiful home";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const fonts = await montserratFonts();

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
        {/* Butter bloom, same gesture as the hero */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 220,
            width: 900,
            height: 620,
            borderRadius: 9999,
            background: BUTTER,
            opacity: 0.55,
            filter: "blur(90px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: INK,
              color: BUTTER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: INK, letterSpacing: -1 }}>Viefolio</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              color: INK,
              letterSpacing: -3.5,
              lineHeight: 1.02,
              maxWidth: 900,
              display: "flex",
            }}
          >
            Your work deserves a beautiful home
          </div>
          <div style={{ fontSize: 30, color: INK_2, maxWidth: 820, display: "flex" }}>
            Six themes, live progress tracking, and your own address.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 999,
              background: INK,
              color: BUTTER,
              fontSize: 24,
              fontWeight: 700,
              display: "flex",
            }}
          >
            yourname.viefolio.com
          </div>
          <div style={{ fontSize: 24, color: INK_2, display: "flex" }}>Free to start · Web &amp; iOS</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

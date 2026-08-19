import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Viefolio — Your work deserves a beautiful home",
    short_name: "Viefolio",
    description:
      "Build a portfolio that grows with you. Six themes, live progress tracking, and your own yourname.viefolio.com address.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfbf3",
    theme_color: "#013e37",
    orientation: "portrait",
    categories: ["productivity", "business", "design"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/viefolio-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

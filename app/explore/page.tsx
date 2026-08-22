import type { Metadata } from "next";
import DirectoryGrid from "./DirectoryGrid";
import { fetchDirectory, PERSONAS } from "@/lib/directory";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Explore portfolios",
  description:
    "Browse real portfolios built with Viefolio — developers, designers, creators and students, each at their own address.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore portfolios · Viefolio",
    description:
      "Browse real portfolios built with Viefolio — developers, designers, creators and students.",
    url: "https://viefolio.com/explore",
    // Defining openGraph at all drops the root opengraph-image, so name it.
    images: ["/opengraph-image"],
  },
};

export default async function ExplorePage() {
  const entries = await fetchDirectory();

  const counts: Record<string, number> = { all: entries.length };
  for (const p of PERSONAS) {
    counts[p.slug] = entries.filter(e => e.accountType === p.type).length;
  }

  return (
    <DirectoryGrid
      eyebrow="The directory"
      title="Portfolios that"
      titleAccent="actually exist"
      lede="Every one of these is somebody's live site, at their own address. Browse by craft, or just look around."
      entries={entries}
      counts={counts}
    />
  );
}

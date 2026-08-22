import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DirectoryGrid from "../DirectoryGrid";
import { fetchDirectory, PERSONAS, personaBySlug } from "@/lib/directory";

export const revalidate = 600;

/* Four known slugs — pre-rendered, and anything else is a 404 rather than an
   endlessly crawlable dynamic segment. */
export function generateStaticParams() {
  return PERSONAS.map(p => ({ persona: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ persona: string }> }): Promise<Metadata> {
  const { persona: slug } = await params;
  const persona = personaBySlug(slug);
  if (!persona) return { title: "Not found", robots: { index: false } };

  const title = `${persona.label} on Viefolio`;
  const description = `${persona.blurb} Real ${persona.singular} portfolios, each at their own address.`;

  return {
    title,
    description,
    alternates: { canonical: `/explore/${persona.slug}` },
    openGraph: { title: `${title} · Viefolio`, description, url: `https://viefolio.com/explore/${persona.slug}`, images: ["/opengraph-image"] },
  };
}

export default async function PersonaPage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona: slug } = await params;
  const persona = personaBySlug(slug);
  if (!persona) notFound();

  const all = await fetchDirectory();
  const entries = all.filter(e => e.accountType === persona.type);

  const counts: Record<string, number> = { all: all.length };
  for (const p of PERSONAS) {
    counts[p.slug] = all.filter(e => e.accountType === p.type).length;
  }

  return (
    <DirectoryGrid
      eyebrow="The directory"
      title={persona.label}
      titleAccent="on Viefolio"
      lede={persona.blurb}
      entries={entries}
      activeSlug={persona.slug}
      counts={counts}
    />
  );
}

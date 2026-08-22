import "server-only";
import type { AccountType } from "@/types/portfolio";

/* Reads for the public Explore directory.

   Only profiles that opted in are ever returned — `listedInDirectory` is a
   single-field equality filter, which Firestore indexes automatically, so this
   needs no composite index and no console setup. */

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/portfolio-df758/databases/(default)/documents";

export interface DirectoryEntry {
  username: string;
  fullName: string;
  title: string;
  bio: string;
  location: string;
  avatarUrl: string;
  accountType: AccountType | null;
  accent: string;
  skills: string[];
}

export const PERSONAS = [
  {
    slug: "developers",
    type: "DEVELOPER" as const,
    label: "Developers",
    singular: "developer",
    blurb: "Engineers shipping side projects, open source and client work.",
  },
  {
    slug: "designers",
    type: "DESIGNER" as const,
    label: "Designers",
    singular: "designer",
    blurb: "Product, brand and interface designers showing the work itself.",
  },
  {
    slug: "creators",
    type: "CREATOR" as const,
    label: "Creators",
    singular: "creator",
    blurb: "Video, audio and writing, with every channel in one place.",
  },
  {
    slug: "students",
    type: "STUDENT" as const,
    label: "Students",
    singular: "student",
    blurb: "Coursework, internships and first projects, presented properly.",
  },
] as const;

export type PersonaSlug = (typeof PERSONAS)[number]["slug"];

export function personaBySlug(slug: string) {
  return PERSONAS.find(p => p.slug === slug);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function str(fields: any, key: string): string {
  return fields?.[key]?.stringValue ?? "";
}

function toEntry(fields: any): DirectoryEntry | null {
  const username = str(fields, "username");
  if (!username) return null;

  const accent =
    fields?.theme?.mapValue?.fields?.colors?.mapValue?.fields?.accent?.stringValue ??
    str(fields, "themeColor") ??
    "#013e37";

  const skills: string[] = (fields?.skills?.arrayValue?.values ?? [])
    .filter((v: any) => v?.mapValue?.fields?.visible?.booleanValue !== false)
    .map((v: any) => v?.mapValue?.fields?.name?.stringValue)
    .filter(Boolean)
    .slice(0, 4);

  return {
    username,
    fullName: str(fields, "fullName") || username,
    title: str(fields, "title"),
    bio: str(fields, "bio"),
    location: str(fields, "location"),
    avatarUrl: fields?.showAvatar?.booleanValue === false ? "" : str(fields, "avatarUrl"),
    accountType: (str(fields, "accountType") as AccountType) || null,
    accent,
    skills,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ponytail: one unpaginated read of every opted-in profile, filtered and
   sorted in memory. Correct while the directory is small; when it stops being
   small, move the persona filter and ordering into the query and add the
   composite index Firestore will then ask for. */
export async function fetchDirectory(): Promise<DirectoryEntry[]> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "profiles" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "listedInDirectory" },
              op: "EQUAL",
              value: { booleanValue: true },
            },
          },
          limit: 500,
        },
      }),
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.document)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => toEntry(r.document.fields))
      .filter(Boolean)
      .sort((a: DirectoryEntry, b: DirectoryEntry) => a.fullName.localeCompare(b.fullName));
  } catch {
    // The directory is a nice-to-have; a Firestore hiccup should render an
    // empty state, not a 500.
    return [];
  }
}

export async function fetchPersona(type: AccountType): Promise<DirectoryEntry[]> {
  const all = await fetchDirectory();
  return all.filter(e => e.accountType === type);
}

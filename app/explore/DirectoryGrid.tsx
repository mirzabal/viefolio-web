import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { PERSONAS, type DirectoryEntry } from "@/lib/directory";
import { Icon } from "@/lib/icons";
import s from "./explore.module.css";

/* Shared shell for /explore and /explore/[persona] — same chrome, same grid,
   different heading and slice of the data. */

function Card({ e }: { e: DirectoryEntry }) {
  const url = `https://${e.username}.viefolio.com`;
  const persona = PERSONAS.find(p => p.type === e.accountType);

  return (
    <article className={`${s.card} tile tile--lift`} style={{ "--accent": e.accent } as React.CSSProperties}>
      <div className={s.cardTop}>
        {e.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.avatarUrl} alt="" loading="lazy" decoding="async" className={s.avatar} />
        ) : (
          <span className={`${s.avatar} ${s.avatarFallback}`} style={{ background: e.accent }} aria-hidden="true">
            {e.fullName.charAt(0).toUpperCase()}
          </span>
        )}
        <span>
          <span className={s.name}>{e.fullName}</span>
          {e.title ? <span className={s.role}>{e.title}</span> : null}
        </span>
      </div>

      {e.bio ? <p className={s.bio}>{e.bio}</p> : null}

      {(persona || e.location || e.skills.length > 0) && (
        <div className={s.meta}>
          {persona ? <span className="tag" data-tone="accent">{persona.singular}</span> : null}
          {e.location ? <span className="tag">{e.location}</span> : null}
          {e.skills.slice(0, 3).map(sk => (
            <span key={sk} className="tag">{sk}</span>
          ))}
        </div>
      )}

      <div className={s.foot}>
        <span className={s.handle}>{e.username}.viefolio.com</span>
        {/* A real cross-host link: this is the only crawlable path from
            viefolio.com to a published portfolio. */}
        <a href={url} className={s.visit} target="_blank" rel="noopener">
          Visit
          <Icon name="external" size={13} strokeWidth={2} />
        </a>
      </div>
    </article>
  );
}

export default function DirectoryGrid({
  eyebrow,
  title,
  titleAccent,
  lede,
  entries,
  activeSlug,
  counts,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  lede: string;
  entries: DirectoryEntry[];
  activeSlug?: string;
  counts: Record<string, number>;
}) {
  return (
    <div className={s.page}>
      <SiteHeader />
      <main className={s.main}>
        <div className="wrap">
          <header className={s.head}>
            <span className="eyebrow">{eyebrow}</span>
            <h1>
              {title}
              {titleAccent ? <> <span className={s.accent}>{titleAccent}</span></> : null}
            </h1>
            <p className="lede">{lede}</p>
          </header>

          <nav className={s.filters} aria-label="Filter by craft">
            <Link href="/explore" className={s.filter} aria-current={activeSlug ? undefined : "page"}>
              Everyone <span className={s.count}>{counts.all}</span>
            </Link>
            {PERSONAS.map(p => (
              <Link
                key={p.slug}
                href={`/explore/${p.slug}`}
                className={s.filter}
                aria-current={activeSlug === p.slug ? "page" : undefined}
              >
                {p.label} <span className={s.count}>{counts[p.slug] ?? 0}</span>
              </Link>
            ))}
          </nav>

          {entries.length === 0 ? (
            <div className={s.empty}>
              <h2>Nobody here yet</h2>
              <p>
                The directory only lists people who chose to be in it. Turn the switch on in your
                dashboard and yours shows up here.
              </p>
              <a href="/login" className="btn btn--primary btn--lg">Build your portfolio</a>
            </div>
          ) : (
            <div className={s.grid}>
              {entries.map(e => (
                <Card key={e.username} e={e} />
              ))}
            </div>
          )}

          <aside className={s.note}>
            <p>
              <strong>Want to be listed?</strong>
              Every portfolio here opted in. Open Appearance or Account Settings in your dashboard and switch on
              &ldquo;List in the Explore directory&rdquo; — you can switch it back off any time.
            </p>
            <a href="/login" className="btn btn--outline">Get started</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

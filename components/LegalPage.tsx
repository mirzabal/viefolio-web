/* Shared shell for legal and support pages. */

import { SiteHeader, SiteFooter } from "./SiteChrome";
import { Icon } from "@/lib/icons";
import s from "./LegalPage.module.css";

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section} id={slug(title)}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/* <details> is the native disclosure widget — no state, no JS, and keyboard
   plus screen-reader behaviour for free. */
export function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className={s.faq}>
      <summary className={s.faqSummary}>
        {q}
        <span className={s.faqMark}>
          <Icon name="chevronDown" size={18} />
        </span>
      </summary>
      <div className={s.faqBody}>{a}</div>
    </details>
  );
}

export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.page}>
      <SiteHeader />
      <main className={s.main}>
        <div className="wrap-narrow">
          <div className={s.header}>
            <h1>{title}</h1>
            {intro ? (
              <p className="lede" style={{ marginBlockStart: "var(--space-s)" }}>
                {intro}
              </p>
            ) : null}
            <p className={s.updated}>
              Last updated <time>{updated}</time>
            </p>
          </div>
          <div className={s.body}>{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

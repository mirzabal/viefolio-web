import Link from "next/link";
import s from "./SiteChrome.module.css";

/* One header and one footer for every public page. They used to be
   re-implemented in the landing page, the legal shell, 404 and the error
   boundary — four copies that drifted apart. */

export function SiteHeader({ cta = "I'm new" }: { cta?: string }) {
  return (
    <header className={s.header}>
      <div className={`wrap ${s.inner}`}>
        <Link href="/" className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" className={s.mark} />
          Viefolio
        </Link>
        <div className={s.actions}>
          <Link href="/explore" className={`btn btn--quiet ${s.hideNarrow}`}>
            Explore
          </Link>
          <a href="/login" className="btn btn--quiet">
            Log in
          </a>
          <a href="/login#signup" className="btn btn--primary btn--sm">
            {cta}
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.footerInner}`}>
        <span className={s.copy}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" />© {new Date().getFullYear()} Viefolio
        </span>
        <nav className={s.links} aria-label="Footer">
          <Link href="/explore">Explore</Link>
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:support@viefolio.com">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

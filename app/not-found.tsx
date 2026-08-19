import Link from "next/link";
import type { Metadata } from "next";
import s from "./status.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className={s.page}>
      <div className={s.card}>
        <img src="/logo.svg" alt="" aria-hidden="true" className={s.mark} />
        <span className={s.code}>404</span>
        <h1>This page doesn&rsquo;t exist</h1>
        <p>
          The link may be out of date, or the portfolio behind it may have moved. Everything else
          is still where you left it.
        </p>
        <div className={s.actions}>
          <Link href="/" className="btn btn--primary btn--lg">Back to Viefolio</Link>
          <Link href="/login#signup" className="btn btn--outline btn--lg">Create a portfolio</Link>
        </div>
      </div>
    </main>
  );
}

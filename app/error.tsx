"use client";

import Link from "next/link";
import s from "./status.module.css";

/* Global error boundary — shown when a page throws (e.g. a Firestore outage) */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={s.page}>
      <div className={s.card}>
        <img src="/logo.svg" alt="" aria-hidden="true" className={s.mark} />
        <span className={s.code}>Something broke</span>
        <h1>We couldn&rsquo;t load this page</h1>
        <p>
          It&rsquo;s almost certainly temporary. Try again in a moment — and if it keeps happening,
          send us the ID below and we&rsquo;ll trace it.
        </p>
        <div className={s.actions}>
          <button onClick={reset} className="btn btn--primary btn--lg">Try again</button>
          <Link href="/" className="btn btn--outline btn--lg">Back home</Link>
        </div>
        {error.digest && <p className={s.digest}>Error ID: {error.digest}</p>}
      </div>
    </main>
  );
}

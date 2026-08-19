"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Icon, Spinner } from "@/lib/icons";
import a from "../auth.module.css";

/* Custom handler for Firebase password-reset links (set as the Action URL in
 * Authentication → Templates). Verifies the code up front so users see the
 * real reason when a link is stale, instead of a generic error page. */

function ResetForm() {
  const params = useSearchParams();
  const oobCode = params.get("oobCode") ?? "";

  const [state, setState] = useState<"checking" | "ready" | "done" | "bad-link">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!oobCode) { setState("bad-link"); setError("This link is incomplete — open it directly from the email."); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then((mail) => { setEmail(mail); setState("ready"); })
      .catch((err: { code?: string }) => {
        setState("bad-link");
        setError(err.code === "auth/expired-action-code"
          ? "This link has expired. Request a new one from the sign-in page."
          : "This link was already used or replaced by a newer email. Only the most recent reset email works — request a fresh one.");
      });
  }, [oobCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setState("done");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/expired-action-code") setError("This link expired while the page was open. Request a new one.");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError("Couldn't reset the password. Request a new link and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={a.page}>
      <div className={a.shell}>
        <Link href="/" className={a.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" />
          Viefolio
        </Link>

        <div className={`${a.card} rise`}>
          {state === "checking" && (
            <p className="muted" style={{ textAlign: "center", paddingBlock: "var(--space-m)", display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
              <Spinner size={16} /> Checking your link…
            </p>
          )}

          {state === "bad-link" && (
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "var(--step-2)" }}>Link not valid</h1>
              <p className="muted" style={{ marginBlock: "var(--space-s) var(--space-l)", fontSize: "var(--step--1)" }}>{error}</p>
              <Link href="/login" className="btn btn--primary btn--block">Back to sign in</Link>
            </div>
          )}

          {state === "ready" && (
            <>
              <div className={a.head}>
                <h1 style={{ fontSize: "var(--step-2)" }}>Set a new password</h1>
                <p>
                  for <strong className="mono">{email}</strong>
                </p>
              </div>
              <form onSubmit={handleSubmit} className={a.form}>
                <div className="field">
                  <label htmlFor="new-password" className="label">New password</label>
                  <input id="new-password" type="password" autoComplete="new-password" required minLength={6}
                    placeholder="At least 6 characters" value={password}
                    onChange={e => setPassword(e.target.value)} className="input" autoFocus />
                </div>
                <div className="field">
                  <label htmlFor="confirm-password" className="label">Confirm password</label>
                  <input id="confirm-password" type="password" autoComplete="new-password" required
                    placeholder="Type it again" value={confirm}
                    data-invalid={!!confirm && confirm !== password}
                    onChange={e => setConfirm(e.target.value)} className="input" />
                </div>
                <div className="collapse" data-open={!!error}>
                  <div className="collapse__inner">
                    <div className="note" data-tone="danger" role="alert">
                      <Icon name="alert" size={16} />
                      <span>{error}</span>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={saving} className="btn btn--primary btn--lg btn--block">
                  {saving ? (<><Spinner size={16} /> Saving…</>) : "Reset password"}
                </button>
              </form>
            </>
          )}

          {state === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                inlineSize: "3rem", blockSize: "3rem", marginInline: "auto",
                marginBlockEnd: "var(--space-s)", borderRadius: "50%",
                background: "var(--success-wash)", color: "var(--success)",
                display: "grid", placeItems: "center",
              }}>
                <Icon name="check" size={22} strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: "var(--step-2)" }}>Password reset</h1>
              <p className="muted" style={{ marginBlock: "var(--space-s) var(--space-l)", fontSize: "var(--step--1)" }}>
                You can sign in with your new password now.
              </p>
              <Link href="/login" className="btn btn--primary btn--block">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

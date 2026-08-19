"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { GoogleIcon, AppleIcon, Spinner, Icon } from "@/lib/icons";
import a from "../auth.module.css";

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

// Firestore is only needed once, right after a successful sign-in — load it
// dynamically so the login page doesn't bundle the whole database SDK.
async function ensureProfile(uid: string, displayName?: string | null) {
  const [{ doc, getDoc, setDoc }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/db"),
  ]);
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { fullName: displayName || "", title: "", bio: "", location: "", username: "", avatarUrl: "", userId: uid });
  }
}

const sanitizeUsername = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);

async function checkUsernameFree(username: string): Promise<boolean> {
  const [{ doc, getDoc, getDocs, collection, query, where }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/db"),
  ]);
  const snap = await getDoc(doc(db, "usernames", username));
  if (snap.exists()) return false;
  // Legacy fallback: profiles saved before username reservations existed
  const legacy = await getDocs(query(collection(db, "profiles"), where("username", "==", username)));
  return legacy.empty;
}

// Sign-up: claim usernames/{username} atomically and create the profile doc —
// same reservation transaction as the dashboard's saveProfile.
async function registerProfile(uid: string, fullName: string, username: string) {
  const [{ doc, getDocs, setDoc, collection, query, where, runTransaction }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/db"),
  ]);
  if (!username) {
    await setDoc(doc(db, "profiles", uid), { fullName, title: "", bio: "", location: "", username: "", avatarUrl: "", userId: uid, emailVerified: false }, { merge: true });
    return;
  }
  const legacy = await getDocs(query(collection(db, "profiles"), where("username", "==", username)));
  if (legacy.docs.some(d => d.id !== uid)) throw new Error("USERNAME_TAKEN");
  await runTransaction(db, async (tx) => {
    const res = await tx.get(doc(db, "usernames", username));
    if (res.exists() && res.data()?.userId !== uid) throw new Error("USERNAME_TAKEN");
    tx.set(doc(db, "usernames", username), { userId: uid });
    tx.set(doc(db, "profiles", uid), { fullName, title: "", bio: "", location: "", username, avatarUrl: "", userId: uid, emailVerified: false }, { merge: true });
  });
}

// Codes ride the same OTP endpoint the password change uses — same hashing,
// expiry and attempt limits, only the purpose differs.
async function requestEmailCode(user: { getIdToken: () => Promise<string> }) {
  const res = await fetch("/api/password-otp/request", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: "EMAIL_VERIFY" }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't send the code.");
}

/* Collapsible without measuring height in JS. grid-template-rows 0fr → 1fr
   (see .collapse in globals.css) replaces framer-motion's height:auto
   animation, which forced a layout pass on every frame — and takes the whole
   animation library off the auth critical path. */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="collapse" data-open={open} aria-hidden={!open}>
      <div className="collapse__inner">{children}</div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  /* There is no separate /signup route — "create an account" CTAs link to
     /login#signup and land here. A hash rather than a query param so the page
     stays statically prerendered (useSearchParams would force it dynamic). */
  useEffect(() => {
    if (window.location.hash === "#signup") setIsSignUp(true);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameTimer = useRef<NodeJS.Timeout | null>(null);
  const spinnerTimer = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  // Post-sign-up code step. The account exists by now; this gates publishing,
  // not access — "I'll do this later" drops them straight into the dashboard.
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  function onUsernameChange(value: string) {
    const clean = sanitizeUsername(value);
    setUsername(clean);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
    if (clean.length < 2) { setUsernameStatus("idle"); return; }
    // Hold the previous status for 300ms. Flipping to a spinner on every
    // keystroke made the indicator flicker the whole time you were typing.
    spinnerTimer.current = setTimeout(() => setUsernameStatus("checking"), 300);
    usernameTimer.current = setTimeout(async () => {
      try {
        const free = await checkUsernameFree(clean);
        if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
        setUsernameStatus(free ? "available" : "taken");
      } catch {
        // Read denied or offline — the sign-up transaction still enforces uniqueness
        if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
        setUsernameStatus("idle");
      }
    }, 500);
  }

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      // The cached user's emailVerified can be stale — reload before gating.
      await u.reload().catch(() => {});
      // An unverified password account stays on the code step instead of being
      // bounced into a dashboard that would only bounce it straight back.
      if (!u.emailVerified && u.providerData.some(p => p.providerId === "password")) {
        setVerifyStep(true);
        return;
      }
      router.replace("/dashboard");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => () => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
  }, []);

  async function handleForgotPassword() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email above first, then click “Forgot password?”.");
      return;
    }
    try {
      const res = await fetch("/api/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setError(data.error ?? "Couldn't send the email. Please try again later.");
        return;
      }
      setInfo(`If an account exists for ${email}, a reset email has been sent — check your inbox and spam folder.`);
    } catch {
      setError("Couldn't send the email. Please try again later.");
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setInfo("");
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureProfile(result.user.uid, result.user.displayName);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user") return;
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError("");
    setInfo("");
    setAppleLoading(true);
    try {
      const result = await signInWithPopup(auth, appleProvider);
      await ensureProfile(result.user.uid, result.user.displayName);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/operation-not-allowed") {
        setError("Apple sign-in isn't available yet. Please use Google or email instead.");
        return;
      }
      if (code === "auth/account-exists-with-different-credential") {
        setError("This email is registered with a different sign-in method.");
        return;
      }
      setError("Apple sign-in failed. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (isSignUp) {
      if (password !== confirmPassword) { setError("Passwords don't match."); return; }
      if (!fullName.trim()) { setError("Please enter your name."); return; }
      if (username.length < 2) { setError("Username must be at least 2 characters."); return; }
      if (usernameStatus === "taken") { setError(`"${username}" is already taken — try ${username}-dev or ${username}hq.`); return; }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: fullName.trim() }).catch(() => {});
        try {
          await registerProfile(result.user.uid, fullName.trim(), username);
        } catch (err: unknown) {
          if (err instanceof Error && err.message === "USERNAME_TAKEN") {
            // Account exists; profile is created without a username so the
            // dashboard can offer a new one.
            await registerProfile(result.user.uid, fullName.trim(), "");
          } else {
            throw err;
          }
        }

        // Email/password only — Google and Apple hand us an already-verified
        // address. The profile exists by now; the code step gates the app.
        await requestEmailCode(result.user).catch(() => {});
        setVerifyStep(true);
        setInfo(`We sent a 6-digit code to ${email}.`);
        return;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await ensureProfile(result.user.uid, result.user.displayName);
        if (!result.user.emailVerified) {
          await requestEmailCode(result.user).catch(() => {});
          setVerifyStep(true);
          setInfo(`We sent a 6-digit code to ${email}.`);
          return;
        }
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const messages: Record<string, string> = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      setError(messages[code] || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitVerifyCode() {
    const user = auth.currentUser;
    if (!user) return;
    setVerifyBusy(true);
    setError("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Couldn't verify that code.");
        return;
      }
      // The flag lives in the token; without a forced refresh the client keeps
      // the stale one and the Firestore rules still see an unverified caller.
      await user.getIdToken(true);
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function resendVerifyCode() {
    const user = auth.currentUser;
    if (!user) return;
    setVerifyBusy(true);
    setError("");
    try {
      await requestEmailCode(user);
      setInfo("New code sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setVerifyBusy(false);
    }
  }

  const submitDisabled =
    loading ||
    (isSignUp && (usernameStatus === "checking" || usernameStatus === "taken" || (!!confirmPassword && confirmPassword !== password)));


  return (
    <div className={a.page}>
      <div className={a.shell}>
        <Link href="/" className={a.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" />
          Viefolio
        </Link>

        {/* One entrance for the card. The old page staggered the logo, card,
            each field and the footer across ~1s — and returning users sat
            through it every single time. */}
        <div className={`${a.card} rise`}>
          <div className={a.head}>
            <h1>{verifyStep ? "Check your email" : isSignUp ? "Create your account" : "Welcome back"}</h1>
            <p>{verifyStep
              ? "Enter the 6-digit code we sent you. It expires in 10 minutes."
              : isSignUp ? "Start building your living portfolio" : "Sign in to continue to your dashboard"}</p>
          </div>

          {verifyStep ? (
            <form className={a.form} onSubmit={e => { e.preventDefault(); submitVerifyCode(); }}>
              <input
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
                value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className={`input ${a.codeInput}`} autoFocus
              />

              <Collapse open={!!info}>
                <div className="note" data-tone="success" role="status">
                  <Icon name="checkCircle" size={16} />
                  <span>{info}</span>
                </div>
              </Collapse>

              <Collapse open={!!error}>
                <div className="note" data-tone="danger" role="alert">
                  <Icon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              </Collapse>

              <button type="submit" disabled={verifyBusy || verifyCode.length !== 6} className="btn btn--primary btn--lg btn--block">
                {verifyBusy ? <><Spinner size={16} />Verifying…</> : "Verify email"}
              </button>
              <button type="button" onClick={resendVerifyCode} disabled={verifyBusy} className="btn btn--quiet btn--sm btn--block">
                Didn&apos;t get it? Resend
              </button>
              <button
                type="button"
                onClick={async () => { await signOut(auth); setVerifyStep(false); setVerifyCode(""); setInfo(""); setError(""); }}
                className="btn btn--quiet btn--sm btn--block"
              >
                Use a different account
              </button>
            </form>
          ) : (
            <>
          <div className={a.providers}>
            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading} className="btn btn--outline btn--block">
              {googleLoading ? <Spinner size={18} /> : <GoogleIcon size={18} />}
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </button>
            <button type="button" onClick={handleAppleSignIn} disabled={appleLoading} className={`btn btn--block ${a.appleBtn}`}>
              {appleLoading ? <Spinner size={18} /> : <AppleIcon size={18} />}
              {appleLoading ? "Signing in…" : "Continue with Apple"}
            </button>
          </div>

          <div className={a.divider}>or with email</div>

          <form onSubmit={handleSubmit} className={a.form}>
            {/* Sign-up only: name + username */}
            <Collapse open={isSignUp}>
              <div className="col" style={{ "--gap": "var(--space-s)" } as React.CSSProperties}>
                <div className="field">
                  <label htmlFor="fullName" className="label">Full name</label>
                  <input
                    id="fullName" type="text" autoComplete="name" required={isSignUp}
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your name" className="input"
                  />
                </div>
                <div className="field">
                  <label htmlFor="username" className="label">Username</label>
                  <div className={a.inputWrap}>
                    <input
                      id="username" type="text" autoComplete="off" required={isSignUp}
                      value={username} onChange={e => onUsernameChange(e.target.value)}
                      placeholder="username" aria-describedby="username-hint"
                      data-invalid={usernameStatus === "taken"}
                      className="input" style={{ paddingInlineEnd: "2.4rem" }}
                    />
                    <span className={a.inputAffix}>
                      {usernameStatus === "checking" && <Spinner size={16} />}
                      {usernameStatus === "available" && (
                        <span style={{ color: "var(--success)", display: "grid" }}><Icon name="checkCircle" size={16} /></span>
                      )}
                      {usernameStatus === "taken" && (
                        <span style={{ color: "var(--danger)", display: "grid" }}><Icon name="xCircle" size={16} /></span>
                      )}
                    </span>
                  </div>
                  <p id="username-hint" className={a.hint} data-tone={usernameStatus === "taken" ? "danger" : undefined}>
                    {usernameStatus === "taken"
                      ? `"${username}" is taken — try ${username}-dev or ${username}hq`
                      : `${username || "yourname"}.viefolio.com`}
                  </p>
                </div>
              </div>
            </Collapse>

            <div className="field">
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email" type="email" autoComplete="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input"
              />
            </div>

            <div className="field">
              <div className={a.labelRow}>
                <label htmlFor="password" className="label">Password</label>
                {!isSignUp && (
                  <button type="button" onClick={handleForgotPassword} className={a.linkBtn}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className={a.inputWrap}>
                <input
                  id="password" type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="input" style={{ paddingInlineEnd: "2.6rem" }}
                />
                <button
                  type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={a.inputAffix}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </div>

            {/* Sign-up only: confirm password + terms */}
            <Collapse open={isSignUp}>
              <div className="field">
                <label htmlFor="confirmPassword" className="label">Confirm password</label>
                <input
                  id="confirmPassword" type="password" autoComplete="new-password"
                  required={isSignUp} minLength={6} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  data-invalid={!!confirmPassword && confirmPassword !== password}
                  className="input"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className={a.hint} data-tone="danger">Passwords don&apos;t match</p>
                )}
                
              </div>
            </Collapse>

            <Collapse open={!!info}>
              <div className="note" data-tone="success" role="status">
                <Icon name="checkCircle" size={16} />
                <span>{info}</span>
              </div>
            </Collapse>

            <Collapse open={!!error}>
              <div className="note" data-tone="danger" role="alert">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </div>
            </Collapse>

            <button type="submit" disabled={submitDisabled} className="btn btn--primary btn--lg btn--block">
              {loading ? (
                <>
                  <Spinner size={16} />
                  {isSignUp ? "Creating account…" : "Signing in…"}
                </>
              ) : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className={a.switcher}>
            {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setInfo(""); setConfirmPassword(""); }}
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>
            </>
          )}
        </div>

        <p className={`${a.legal} rise delay-1`}>
          By continuing you agree to our <a href="/terms">Terms</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

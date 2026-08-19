"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import type { AccountType } from "@/types/portfolio";
import { THEME_PRESETS } from "@/types/portfolio";
import { Spinner, Icon } from "@/lib/icons";
import { useDialog } from "@/lib/use-dialog";
import c from "./OnboardingModal.module.css";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ─── Card Data ──────────────────────────────────────── */
const ACCOUNT_OPTIONS: {
  type: AccountType;
  title: string;
  desc: string;
  iconPath: string;
}[] = [
  {
    type: "DEVELOPER",
    title: "Developer",
    desc: "Build & showcase dev projects",
    iconPath: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  {
    type: "DESIGNER",
    title: "Designer",
    desc: "Present your creative portfolio",
    iconPath:
      "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
  },
  {
    type: "CREATOR",
    title: "Creator",
    desc: "Share your links & content",
    iconPath:
      "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  },
  {
    type: "STUDENT",
    title: "Student",
    desc: "Highlight your academic work",
    iconPath:
      "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
  },
];

/* ─── Smart Defaults per Account Type ───────────────── */
// THEME_PRESETS entries are complete themes now (font, card, button, texture),
// so spreading one is enough — no undefined fields for Firestore to reject.
function getSmartDefaults(type: AccountType) {
  switch (type) {
    case "CREATOR":
      return { layoutStyle: "CAROUSEL" as const, socialLinksLayout: "CREATOR" as const, theme: { preset: "NEON" as const, ...THEME_PRESETS.NEON } };
    case "DESIGNER":
      return { theme: { preset: "GLASSMORPHISM" as const, ...THEME_PRESETS.GLASSMORPHISM } };
    default:
      return { theme: { preset: "MINIMAL" as const, ...THEME_PRESETS.MINIMAL } };
  }
}

/* ═══════════════════════════════════════════════════════
   OnboardingModal
   ═══════════════════════════════════════════════════════ */
export default function OnboardingModal({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Onboarding is mandatory — Escape must not dismiss it, but focus still
  // needs trapping and the page behind it must stop scrolling.
  const dialogRef = useDialog(() => {}, { closeOnEscape: false });

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const defaults = getSmartDefaults(selected);
      await setDoc(
        doc(db, "profiles", userId),
        { accountType: selected, ...defaults },
        { merge: true }
      );
      onComplete();
    } catch (err) {
      console.error("Onboarding save error:", err);
      // Was a blocking window.alert() — unstyled, and it stole focus out of
      // the dialog.
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className={`${c.overlay} on-ink`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={c.scrim} />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className={c.dialog}
        initial={{ opacity: 0, transform: "translateY(20px) scale(0.98)" }}
        animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        <div className={c.brand}>
          <img src="/logo.svg" alt="" aria-hidden="true" className={c.brandMark} />
          Viefolio
        </div>

        <div className={c.head}>
          <h1 id="onboarding-title">How do you plan to use Viefolio?</h1>
          <p className="lede" style={{ color: "var(--on-ink-2)" }}>
            Pick what fits you best. We&apos;ll set sensible defaults — every one of them is
            changeable later.
          </p>
        </div>

        <div className={c.grid}>
          {ACCOUNT_OPTIONS.map((opt, i) => {
            const isActive = selected === opt.type;
            return (
              <motion.button
                key={opt.type}
                type="button"
                aria-pressed={isActive}
                initial={{ opacity: 0, transform: "translateY(14px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                /* 50ms stagger, no leading delay. The old sequence started at
                   150ms and stepped 80ms, so the last card landed near 0.9s. */
                transition={{ delay: i * 0.05, duration: 0.3, ease: EASE_OUT }}
                onClick={() => setSelected(opt.type)}
                className={c.option}
              >
                {/* One animation for the active state, not two. The card used
                    to scale AND run this layout animation at the same time. */}
                {isActive && (
                  <motion.span
                    layoutId="onboarding-glow"
                    className={c.glow}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  />
                )}
                <span className={c.optionIcon}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={opt.iconPath} />
                  </svg>
                </span>
                <span className={c.optionText}>
                  <span className={c.optionTitle}>{opt.title}</span>
                  <span className={c.optionDesc}>{opt.desc}</span>
                </span>
                {/* Never from scale(0) — nothing in the real world appears out
                    of nothing. */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      className={c.tick}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                    >
                      <Icon name="check" size={12} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        <div className={c.footer}>
          {error && <p role="alert" className={c.error}>{error}</p>}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || saving}
            className={`btn btn--lg ${c.confirm}`}
          >
            {saving ? (<><Spinner size={16} /> Setting up…</>) : "Continue"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

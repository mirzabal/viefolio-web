/* Server component. Motion is CSS plus one IntersectionObserver in <Reveal>,
   so the landing page ships no animation library. */
import type { Metadata } from "next";
import Features from "./components/Features";
import Reveal from "@/components/Reveal";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { AppleIcon, Icon } from "@/lib/icons";
import s from "./page.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const APP_STORE = "https://apps.apple.com/tr/app/viefolio/id6792746265";

const PERSONAS = [
  { icon: "code", label: "Developers", desc: "Timelines, GitHub links, stack badges, live progress bars." },
  { icon: "palette", label: "Designers", desc: "Carousel galleries, Figma links, Dribbble and Behance profiles." },
  { icon: "video", label: "Creators", desc: "Link-in-bio layouts with YouTube, TikTok and Instagram." },
  { icon: "cap", label: "Students", desc: "Coursework, internships and academic projects in one place." },
] as const;

const STEPS = [
  { n: "01", h: "Add your work", b: "Projects, tools, links, skills — whether you code, design, film or study." },
  { n: "02", h: "Choose your theme", b: "Six curated presets, then your own colours, fonts and card shapes." },
  { n: "03", h: "Go live", b: "Share yourname.viefolio.com. No deployment, no config, no build step." },
] as const;

const THEME_SWATCHES = [
  { l: "Minimal", bg: "#fffefa", fg: "#013e37" },
  { l: "Neon", bg: "#0a0a0a", fg: "#22d3ee" },
  { l: "Glass", bg: "#013e37", fg: "#ffefb3" },
  { l: "Soft", bg: "#fff9e2", fg: "#845506" },
] as const;

export default function Home() {
  return (
    <div className={s.page}>
      <SiteHeader />

      <main>
        {/* ─── Hero ────────────────────────────────────── */}
        <section className={s.hero}>
          <div className={`wrap ${s.heroInner}`}>
            <p className={`${s.badge} rise`}>
              <span className={s.badgeDot} aria-hidden="true" />
              For developers, designers, creators &amp; students
            </p>

            <h1 className={`${s.title} rise delay-1`}>
              Your work deserves <span className={s.titleAccent}>a beautiful home</span>
            </h1>

            <p className={`lede ${s.heroLede} rise delay-2`}>
              Viefolio builds you a portfolio that keeps growing — six themes, layouts shaped
              around your craft, and progress you can actually show, not just describe.
            </p>

            <div className={`${s.heroActions} rise delay-3`}>
              <a href="/login#signup" className="btn btn--primary btn--lg">
                <Icon name="sparkle" size={16} />
                Build your portfolio
              </a>
              <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--lg">
                <AppleIcon size={16} />
                Download for iOS
              </a>
            </div>

            <p className={`${s.heroMeta} rise delay-3`}>Free to start · No credit card · Live in minutes</p>

            {/* Product shot */}
            <div className={`${s.mockup} rise delay-4`}>
              <div className={s.mockupBar}>
                <div className={s.mockupDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className={s.mockupUrl}>
                  <span>yourname.viefolio.com</span>
                </div>
              </div>
              <div className={s.mockupBody}>
                {[
                  { tone: "butter", icon: "code", tags: ["React", "Firebase"], w: "72%" },
                  { tone: "wash", icon: "palette", tags: ["Figma", "Framer"], w: "55%" },
                  { tone: "ink", icon: "video", tags: ["YouTube", "TikTok"], w: "88%" },
                ].map((c, i) => (
                  <div key={c.icon} className={`${s.miniCard} drift`} style={{ animationDelay: `${i * 0.6}s` }}>
                    <div className={s.miniThumb} data-tone={c.tone}>
                      <Icon name={c.icon} size={24} />
                    </div>
                    <div className={s.miniLineWide} />
                    <div className={s.miniLineNarrow} />
                    <div className={s.miniTags}>
                      {c.tags.map(t => (
                        <span key={t} className={s.miniTag}>{t}</span>
                      ))}
                    </div>
                    <span className="progress" style={{ "--progress-h": "4px" } as React.CSSProperties}>
                      <span className="progress__fill" style={{ width: c.w }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Infrastructure (dark section) ───────────── */}
        <Features />

        {/* ─── Capabilities ────────────────────────────── */}
        <section className={s.section}>
          <div className="wrap">
            <Reveal className={s.sectionHead}>
              <span className="eyebrow">Built for everyone</span>
              <h2>
                Every craft deserves to <span className={s.titleAccent}>stand out</span>
              </h2>
              <p className="lede">
                One toolkit for showing work, tracking progress and impressing whoever opens the link.
              </p>
            </Reveal>

            <div className="stack" style={{ "--stack-gap": "var(--space-s)" } as React.CSSProperties}>
              <Reveal className={s.railCard}>
                <div className={s.iconPad}>
                  <Icon name="palette" size={22} />
                </div>
                <div>
                  <span className="tag" data-tone="accent">New</span>
                  <h3 style={{ marginBlock: "0.6rem 0.4rem", fontSize: "var(--step-2)" }}>Modular theme engine</h3>
                  <p style={{ maxInlineSize: "58ch", color: "var(--ink-2)", fontSize: "var(--step--1)", lineHeight: 1.65 }}>
                    Six presets — Minimal, Neon, Glass, Brutalist, Soft, Monochrome — then tune the
                    font, card style, button shape and colours down to the hex code.
                  </p>
                </div>
                <div className={s.themeSwatches} aria-hidden="true">
                  {THEME_SWATCHES.map(t => (
                    <div key={t.l} className={s.swatch} style={{ backgroundColor: t.bg, color: t.fg }}>
                      <span className={s.swatchDot} style={{ backgroundColor: t.fg }} />
                      {t.l}
                    </div>
                  ))}
                </div>
              </Reveal>

              <div className={s.grid3}>
                {[
                  { icon: "users", h: "Multi-persona layouts", p: "Developer timelines, designer grids, creator link pages, student CVs — all from one dashboard." },
                  { icon: "chart", h: "Live progress tracking", p: "Set milestones, tick checkpoints, and let visitors watch the work happen in real time." },
                  { icon: "mobile", h: "Web and iOS, in sync", p: "Update from your phone, see it live on the web instantly. One portfolio, two surfaces." },
                ].map((f, i) => (
                  <Reveal key={f.h} delay={i * 60} className={`${s.featureCard} tile tile--lift`}>
                    <div className={s.iconPad}>
                      <Icon name={f.icon} size={20} />
                    </div>
                    <h3>{f.h}</h3>
                    <p>{f.p}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Personas ────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionSunk}`}>
          <div className="wrap">
            <Reveal className={s.sectionHead}>
              <h2>One platform, every creative path</h2>
              <p className="lede">Whatever you make, there is a layout and a theme shaped for it.</p>
            </Reveal>
            <div className={s.grid4}>
              {PERSONAS.map((p, i) => (
                <Reveal key={p.label} delay={i * 60} className={`${s.featureCard} tile tile--lift`}>
                  <div className={s.iconPad}>
                    <Icon name={p.icon} size={20} />
                  </div>
                  <h3>{p.label}</h3>
                  <p>{p.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ────────────────────────────── */}
        <section className={s.section}>
          <div className="wrap">
            <Reveal className={s.sectionHead}>
              <span className="eyebrow">How it works</span>
              <h2>Up and running in minutes</h2>
            </Reveal>
            <div className={s.steps}>
              {STEPS.map((st, i) => (
                <Reveal key={st.n} delay={i * 60} className={s.step}>
                  <span className={s.stepNum}>{st.n}</span>
                  <h3>{st.h}</h3>
                  <p>{st.b}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Closing CTA ─────────────────────────────── */}
        <section className={s.cta}>
          <div className="wrap">
            <Reveal className={`${s.ctaCard} on-ink`}>
              <span className="eyebrow" style={{ color: "var(--on-ink-2)" }}>Free to start</span>
              <h2 style={{ marginBlockStart: "var(--space-xs)" }}>
                Ready to <span className={s.titleAccent}>stand out</span>?
              </h2>
              <p className="lede" style={{ marginBlockStart: "var(--space-s)", marginInline: "auto", maxInlineSize: "46ch" }}>
                Join the developers, designers, creators and students already showing their best
                work at their own address.
              </p>
              <div className={s.ctaActions}>
                <a href="/login#signup" className="btn btn--accent btn--lg">
                  Create your portfolio
                </a>
                <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--lg">
                  <AppleIcon size={16} />
                  Download for iOS
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

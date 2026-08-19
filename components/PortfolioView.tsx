"use client";

import { useState } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence, MotionConfig } from "framer-motion";
import type { Profile, Project, Checkpoint, TechStack, ProjectLink, Skill, Theme, SocialLink, SocialLinksLayout, ThemeFont, CardStyle, ButtonStyle } from "@/types/portfolio";
import { DEFAULT_THEME } from "@/types/portfolio";
import { ICON_PATHS, BrandIcon, Icon, linkLabel } from "@/lib/icons";
import { useDialog } from "@/lib/use-dialog";
import s from "./PortfolioView.module.css";

/* Shared motion values. The curve matches --ease-out in globals.css so CSS
   and JS motion on the same page feel like one system. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const REVEAL_VIEWPORT = { once: true, margin: "-60px" } as const;

/* ─── Theme helpers ──────────────────────────────────── */
export function getThemeStyles(theme: Theme) {
  const t = theme ?? DEFAULT_THEME;
  const preset = t.preset;
  const c = t.colors;
  const isDark = preset === "NEON" || preset === "GLASSMORPHISM";

  let cardStyle: React.CSSProperties = { backgroundColor: c.card, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0" };
  const wrapperBg: React.CSSProperties = { backgroundColor: c.background, color: c.text };

  if (preset === "NEON") {
    cardStyle = { ...cardStyle, boxShadow: `0 0 20px ${c.accent}18, 0 0 60px ${c.accent}08` };
  } else if (preset === "GLASSMORPHISM") {
    cardStyle = { ...cardStyle, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.12)" };
  } else if (preset === "BRUTALIST") {
    cardStyle = { ...cardStyle, borderRadius: "4px", borderColor: "#000", borderWidth: "2px", boxShadow: "4px 4px 0 #000" };
  }

  return { cardStyle, wrapperBg, isDark, preset };
}

export function getFontStyle(fontFamily?: ThemeFont): React.CSSProperties {
  switch (fontFamily) {
    case "SERIF": return { fontFamily: "var(--font-serif), Georgia, serif" };
    case "MONO": return { fontFamily: "var(--font-mono)" };
    case "DISPLAY": return { fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif" };
    default: return {};
  }
}

/* One override function instead of two near-identical switches. */
export function getCardOverride(cardStyle?: CardStyle, variant: "card" | "link" = "card"): React.CSSProperties {
  const isLink = variant === "link";
  switch (cardStyle) {
    case "GLASSMORPHIC": return { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.18)" };
    case "SOFT_SHADOW": return isLink ? { boxShadow: "0 4px 24px rgba(0,0,0,0.07)" } : { boxShadow: "0 4px 24px rgba(0,0,0,0.07)", borderColor: "transparent" };
    case "BRUTALIST": return isLink
      ? { boxShadow: "3px 3px 0 var(--theme-accent)" }
      : { borderRadius: "4px", borderWidth: "2px", borderStyle: "solid", borderColor: "var(--theme-text)", boxShadow: "4px 4px 0 var(--theme-accent)" };
    case "FLAT": return { boxShadow: "none" };
    default: return {};
  }
}

export function getButtonRadius(buttonStyle?: ButtonStyle): string {
  switch (buttonStyle) {
    case "PILL": return "999px";
    case "SHARP": return "4px";
    default: return "14px";
  }
}

export function getButtonOverride(buttonStyle?: ButtonStyle, color?: string): React.CSSProperties {
  if (buttonStyle === "GHOST") return { backgroundColor: "transparent", borderColor: color ?? "#013e37", borderWidth: "1.5px", borderStyle: "solid" };
  if (buttonStyle === "SHARP") return { borderRadius: "4px" };
  return {};
}

function textureCSS(texture: string, accent: string): React.CSSProperties {
  if (texture === "DOTS") return { backgroundImage: `radial-gradient(${accent}38 1.5px, transparent 1.5px)`, backgroundSize: "18px 18px" };
  if (texture === "GRID") return { backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`, backgroundSize: "32px 32px" };
  if (texture === "NOISE") return { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.10'/%3E%3C/svg%3E")` };
  return {};
}

/* ─── Small pieces ───────────────────────────────────── */
export function ensureHttps(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function formatDateSpan(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  const fmt = (d: string) => {
    if (!d || d === "present") return "Present";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  if (!startDate) return fmt(endDate);
  if (!endDate || endDate === "present") return `${fmt(startDate)} — Present`;
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export function calcProgress(cps: Checkpoint[]): number {
  if (!cps.length) return 0;
  return Math.round(cps.filter(c => c.isCompleted).reduce((sum, c) => sum + c.percentage, 0));
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  SOLO: "Solo", TEAM: "Team", INTERNSHIP: "Internship", ACADEMIC: "Academic",
  FREELANCE: "Freelance", CLIENT: "Client", PERSONAL: "Personal",
  OPEN_SOURCE: "Open Source", COMMISSION: "Commission",
};

/* Reveals on scroll with scaleX rather than animating `width`. The old
   `transition-all duration-700` never fired at all — the value never changes
   after mount, so nothing transitioned. */
function ProgressBar({ value, color, height = 6, className = "" }: { value: number; color: string; height?: number; className?: string }) {
  return (
    <span className={`progress ${className}`} style={{ "--progress-h": `${height}px`, "--track": "var(--t-sunk)" } as React.CSSProperties}>
      <m.span
        className="progress__fill"
        style={{ width: `${value}%`, background: color }}
        initial={{ transform: "scaleX(0)" }}
        whileInView={{ transform: "scaleX(1)" }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      />
    </span>
  );
}

function BadgeRow({ p, color }: { p: Project; color: string }) {
  const dateLabel = formatDateSpan(p.startDate, p.endDate);
  if (!dateLabel && (!p.projectType || p.projectType === "SOLO")) return null;
  return (
    <span className={s.badgeRow}>
      {p.projectType && p.projectType !== "SOLO" && (
        <span className={s.badge} style={{ color, backgroundColor: `${color}14` }}>
          {PROJECT_TYPE_LABELS[p.projectType] || p.projectType}
        </span>
      )}
      {dateLabel && <span className={`${s.badge} ${s.badgeNeutral}`}>{dateLabel}</span>}
    </span>
  );
}

function StatusPill({ released, prog, color }: { released: boolean; prog: number; color: string }) {
  return (
    <span className={s.status} style={{ color, backgroundColor: `${color}14`, borderColor: `${color}30` }}>
      {released ? (<><Icon name="check" size={11} strokeWidth={3} />Completed</>) : `${prog}%`}
    </span>
  );
}

/* The zoom button sits beside the card trigger rather than nested inside it —
   a <button> inside a <button> is invalid markup and breaks the keyboard. */
function CardMedia({ p, color, height, onImageClick }: {
  p: Project; color: string; height: string; onImageClick?: (url: string) => void;
}) {
  const iconPath = ICON_PATHS[p.icon] ?? ICON_PATHS.Code;

  if (p.showImage && p.imageUrl) {
    return (
      <div className={`${s.media} ${s.imgZone} img-zone`} style={{ blockSize: height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl} alt="" aria-hidden="true" className={s.mediaBlur} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl} alt={p.title} loading="lazy" decoding="async" className={`${s.mediaImg} zoom-img`} />
        {onImageClick && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onImageClick(p.imageUrl); }}
            aria-label={`Open image for ${p.title}`}
            className="img-overlay"
            style={{ zIndex: 2 }}
          >
            <Icon name="search" size={22} strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={s.mediaEmpty} style={{ blockSize: height, backgroundColor: `${color}0f` }}>
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} aria-hidden="true">
        <path d={iconPath} />
      </svg>
    </div>
  );
}

/* ─── Lightbox ───────────────────────────────────────── */
export function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const dialogRef = useDialog(onClose);
  if (!url) return null;
  return (
    // Own LazyMotion wrapper — the dashboard renders this standalone
    <LazyMotion features={domAnimation}>
      <div className={s.lightbox} onClick={onClose}>
        <m.div
          className={s.lightboxScrim}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
        <m.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          tabIndex={-1}
          className={s.lightboxFrame}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          onClick={e => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" />
          <button onClick={onClose} aria-label="Close preview" className={s.lightboxClose}>
            <Icon name="close" size={18} strokeWidth={2.4} />
          </button>
        </m.div>
      </div>
    </LazyMotion>
  );
}

/* ─── Identity ───────────────────────────────────────── */
export function UserInfoSection({ profile, color }: { profile: Profile; color: string }) {
  const layout = profile.userInfoLayout || "LEFT";
  const initial = (profile.fullName || profile.username || "U").charAt(0).toUpperCase();

  const avatar = profile.showAvatar
    ? profile.avatarUrl
      ? // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt={profile.fullName} width={80} height={80} fetchPriority="high" decoding="async" className={s.avatar} style={{ boxShadow: `0 8px 30px ${color}26` }} />
      : <div className={`${s.avatar} ${s.avatarFallback}`} style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}26` }}>{initial}</div>
    : null;

  return (
    <section className={s.identity}>
      <div className={s.identityRow} data-layout={layout}>
        {avatar}
        <div className={s.identityText} style={{ textAlign: layout === "CENTER" ? "center" : layout === "RIGHT" ? "end" : "start" }}>
          {profile.fullName && <h1>{profile.fullName}</h1>}
          {profile.title && <p className={s.role}>{profile.title}</p>}
          {profile.location && (
            <p className={s.place} style={{ justifyContent: layout === "CENTER" ? "center" : layout === "RIGHT" ? "flex-end" : "flex-start" }}>
              <Icon name="pin" size={14} />
              {profile.location}
            </p>
          )}
          {profile.bio && <p className={s.bio}>{profile.bio}</p>}
        </div>
      </div>
    </section>
  );
}

/* ─── Social links ───────────────────────────────────── */
export function SocialLinksSection({ links, layout, color, buttonStyle, cardStyle }: {
  links: SocialLink[]; layout: SocialLinksLayout; color: string; buttonStyle?: ButtonStyle; cardStyle?: CardStyle;
}) {
  const visible = links.filter(l => l.visible !== false && l.url);
  if (visible.length === 0) return null;

  const radius = getButtonRadius(buttonStyle);
  const btnOverride = getButtonOverride(buttonStyle, color);
  const linkOverride = getCardOverride(cardStyle, "link");

  if (layout === "ICONS") {
    return (
      <section className={s.section}>
        <div className={s.iconRow}>
          {visible.map(l => (
            <a
              key={l.id} href={ensureHttps(l.url)} target="_blank" rel="noopener noreferrer"
              className={`${s.iconLink} tile tile--grow`}
              style={{ borderRadius: radius, borderColor: `${color}3d`, color, backgroundColor: "var(--theme-card)", ...linkOverride, ...btnOverride }}
              title={l.title || l.type}
            >
              <BrandIcon type={l.type} size={16} />
              <span className="sr-only">{l.title || linkLabel(l.type)}</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (layout === "CARD") {
    return (
      <section className={s.section}>
        <div className={s.cardRow}>
          {visible.map(l => (
            <a
              key={l.id} href={ensureHttps(l.url)} target="_blank" rel="noopener noreferrer"
              className={`${s.linkCard} tile tile--nudge`}
              style={{ borderRadius: radius, borderColor: `${color}29`, backgroundColor: "var(--theme-card)", color: "var(--theme-text)", ...linkOverride, ...btnOverride }}
            >
              {l.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.imageUrl} alt="" loading="lazy" decoding="async" className={s.linkThumb} />
              ) : (
                <span className={s.linkThumb} style={{ backgroundColor: `${color}1f`, color }}>
                  <BrandIcon type={l.type} size={16} />
                </span>
              )}
              {l.title || linkLabel(l.type)}
            </a>
          ))}
        </div>
      </section>
    );
  }

  // CREATOR — full-width stacked buttons
  const creatorRadius = buttonStyle === "SHARP" ? "4px" : buttonStyle === "ROUNDED" ? "18px" : "999px";
  return (
    <section className={s.section}>
      <div className={s.creatorList}>
        {visible.map((l, i) => (
          <m.a
            key={l.id} href={ensureHttps(l.url)} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, transform: "translateY(10px)" }}
            whileInView={{ opacity: 1, transform: "translateY(0px)" }}
            viewport={REVEAL_VIEWPORT}
            transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.28, ease: EASE_OUT }}
            className={`${s.creatorLink} tile tile--nudge`}
            style={{ borderRadius: creatorRadius, backgroundColor: buttonStyle === "GHOST" ? "transparent" : "var(--theme-card)", borderColor: `${color}3d`, color: "var(--theme-text)", ...linkOverride }}
          >
            {l.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.imageUrl} alt="" loading="lazy" decoding="async" className={s.creatorAvatar} style={{ borderColor: `${color}3d` }} />
            ) : null}
            <span className={s.creatorText} style={{ textAlign: l.imageUrl ? "start" : "center" }}>
              <span className={s.creatorTitle}>{l.title || linkLabel(l.type)}</span>
              <span className={s.creatorUrl}>{l.url.replace(/^https?:\/\//, "")}</span>
            </span>
          </m.a>
        ))}
      </div>
    </section>
  );
}

/* ─── Skills ─────────────────────────────────────────── */
function SkillsSection({ skills, color, cardStyle }: { skills: Skill[]; color: string; cardStyle?: CardStyle }) {
  const visible = (skills || []).filter(sk => sk.visible !== false);
  if (visible.length === 0) return null;
  const override = getCardOverride(cardStyle);
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <span style={{ color, display: "grid" }}><Icon name="sparkle" size={16} strokeWidth={2} /></span>
        <h2>Skills</h2>
      </div>
      <div className={s.skillGrid}>
        {visible.map((sk, i) => (
          <div key={i} className={s.skill} style={override}>
            <div className={s.skillRow}>
              <span className={s.skillName}>{sk.name}</span>
              <span className={s.skillLevel}>{sk.level}%</span>
            </div>
            <ProgressBar value={sk.level} color={`linear-gradient(90deg, ${color}, ${color}cc)`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Project cards ──────────────────────────────────── */
function ProjectCard({ p, color, onClick, onImageClick, cardStyle }: {
  p: Project; color: string; onClick: () => void; onImageClick?: (url: string) => void; cardStyle?: CardStyle;
}) {
  const released = p.status === "RELEASED" || p.status === "COMPLETED";
  const prog = calcProgress(p.checkpoints);
  return (
    <div className={`${s.card} tile tile--lift`} style={getCardOverride(cardStyle)}>
      <CardMedia p={p} color={color} height="10rem" onImageClick={onImageClick} />
      <button onClick={onClick} className={s.cardTrigger}>
        <span className={s.cardTop}>
          <span className={s.cardTitle}>{p.title}</span>
          <StatusPill released={released} prog={prog} color={color} />
        </span>
        <BadgeRow p={p} color={color} />
        {p.description && <span className={s.cardDesc}>{p.description}</span>}
        {!released && p.checkpoints.length > 0 && (
          <ProgressBar value={prog} color={prog === 100 ? "#2c6b46" : color} className={s.barSpace} />
        )}
        <span className={s.cardFoot}>
          <span className={s.stack}>
            {p.techStack.filter(t => t.technologyName).slice(0, 4).map((t: TechStack, i: number) => (
              <span key={i} className={`${s.badge} ${s.badgeNeutral}`}>{t.technologyName}</span>
            ))}
          </span>
          <span className={s.linkGlyphs} style={{ color }}>
            {p.links.filter(l => l.url && l.url !== "#").slice(0, 3).map((l: ProjectLink, i: number) => (
              <BrandIcon key={i} type={l.type} size={14} />
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}

function MinimalCard({ p, color, onClick, onImageClick, cardStyle }: {
  p: Project; color: string; onClick: () => void; onImageClick?: (url: string) => void; cardStyle?: CardStyle;
}) {
  const released = p.status === "RELEASED" || p.status === "COMPLETED";
  const prog = calcProgress(p.checkpoints);
  const iconPath = ICON_PATHS[p.icon] ?? ICON_PATHS.Code;
  return (
    <div className={`${s.minimalCard} tile tile--lift`} style={getCardOverride(cardStyle)}>
      {p.showImage && p.imageUrl ? (
        <div className={`${s.minimalThumb} img-zone`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt="" aria-hidden="true" className={s.mediaBlur} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt={p.title} loading="lazy" decoding="async" className={`${s.mediaImg} zoom-img`} />
          {onImageClick && (
            <button type="button" onClick={e => { e.stopPropagation(); onImageClick(p.imageUrl); }} aria-label={`Open image for ${p.title}`} className="img-overlay" style={{ zIndex: 2 }}>
              <Icon name="search" size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      ) : (
        <div className={s.minimalThumb} style={{ backgroundColor: `${color}0f` }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} aria-hidden="true">
            <path d={iconPath} />
          </svg>
        </div>
      )}
      <button onClick={onClick} className={s.cardTrigger} style={{ padding: 0, flex: 1, minInlineSize: 0 }}>
        <span className={s.cardTop}>
          <span className={s.cardTitle}>{p.title}</span>
          <StatusPill released={released} prog={prog} color={color} />
        </span>
        <BadgeRow p={p} color={color} />
        {p.description && <span className={s.cardDesc}>{p.description}</span>}
        <span className={s.stack}>
          {p.techStack.filter(t => t.technologyName).slice(0, 5).map((t: TechStack, i: number) => (
            <span key={i} className={`${s.badge} ${s.badgeNeutral}`}>{t.technologyName}</span>
          ))}
        </span>
      </button>
    </div>
  );
}

function CarouselCard({ p, color, onClick, onImageClick, cardStyle }: {
  p: Project; color: string; onClick: () => void; onImageClick?: (url: string) => void; cardStyle?: CardStyle;
}) {
  const released = p.status === "RELEASED" || p.status === "COMPLETED";
  const prog = calcProgress(p.checkpoints);
  return (
    <div className={`${s.carouselCard} tile tile--lift`} style={getCardOverride(cardStyle)}>
      <CardMedia p={p} color={color} height="11rem" onImageClick={onImageClick} />
      <button onClick={onClick} className={s.cardTrigger}>
        <span className={s.cardTop}>
          <span className={s.cardTitle}>{p.title}</span>
          <StatusPill released={released} prog={prog} color={color} />
        </span>
        <BadgeRow p={p} color={color} />
        {p.description && <span className={s.cardDesc}>{p.description}</span>}
      </button>
      <div className={s.carouselBody}>
        {!released && p.checkpoints.length > 0 && (
          <ProgressBar value={prog} color={prog === 100 ? "#2c6b46" : color} className={s.barSpace} />
        )}
        {p.checkpoints.length > 0 ? (
          <div className={s.checkList}>
            {p.checkpoints.map((cp: Checkpoint, i: number) => (
              <div key={i} className={s.checkRow}>
                <span className={s.checkDot} style={{ backgroundColor: cp.isCompleted ? "#2c6b46" : "var(--t-line)" }} />
                <span style={{ opacity: cp.isCompleted ? 1 : 0.55 }}>{cp.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.stack}>
            {p.techStack.filter(t => t.technologyName).slice(0, 6).map((t: TechStack, i: number) => (
              <span key={i} className={`${s.badge} ${s.badgeNeutral}`}>{t.technologyName}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* whileInView, not animate: nodes below the fold used to finish their
   entrance before anyone saw them. Stagger caps at 6 so a long timeline
   doesn't take over a second to settle. */
function TimelineNode({ p, color, onClick, index, cardStyle }: {
  p: Project; color: string; onClick: () => void; index: number; cardStyle?: CardStyle;
}) {
  const released = p.status === "RELEASED" || p.status === "COMPLETED";
  const prog = calcProgress(p.checkpoints);
  const dateLabel = formatDateSpan(p.startDate, p.endDate);
  const iconPath = ICON_PATHS[p.icon] ?? ICON_PATHS.Code;

  return (
    <m.div
      initial={{ opacity: 0, transform: "translateX(-14px)" }}
      whileInView={{ opacity: 1, transform: "translateX(0px)" }}
      viewport={REVEAL_VIEWPORT}
      transition={{ delay: Math.min(index, 6) * 0.06, duration: 0.35, ease: EASE_OUT }}
      className={s.node}
    >
      <span className={s.nodeLine} style={{ backgroundColor: `${color}29` }} aria-hidden="true" />
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" className={s.nodeAvatar} style={{ borderColor: color }} />
      ) : (
        <span className={s.nodeDot} style={{ borderColor: color }} aria-hidden="true" />
      )}

      <button onClick={onClick} className={`${s.card} ${s.cardTrigger} tile tile--lift`} style={getCardOverride(cardStyle)}>
        {dateLabel && <span className={s.nodeDate} style={{ color }}>{dateLabel}</span>}
        <span className={s.cardTop}>
          <span className={s.nodeHead}>
            <span className={s.nodeIcon} style={{ backgroundColor: `${color}14`, color }}>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={iconPath} />
              </svg>
            </span>
            <span style={{ minInlineSize: 0 }}>
              <span className={s.cardTitle} style={{ display: "block" }}>{p.title}</span>
              {p.description && <span className={s.cardDesc} style={{ WebkitLineClamp: 1, marginBlockEnd: 0 }}>{p.description}</span>}
            </span>
          </span>
          <StatusPill released={released} prog={prog} color={color} />
        </span>
        <span className={s.badgeRow} style={{ marginBlockStart: "0.5rem" }}>
          {p.techStack.filter(t => t.technologyName).slice(0, 4).map((t: TechStack, i: number) => (
            <span key={i} className={`${s.badge} ${s.badgeNeutral}`}>{t.technologyName}</span>
          ))}
        </span>
        {!released && p.checkpoints.length > 0 && <ProgressBar value={prog} color={color} />}
      </button>
    </m.div>
  );
}

/* ─── Detail dialog ──────────────────────────────────── */
function DetailModal({ p, color, onClose, onImageClick }: {
  p: Project; color: string; onClose: () => void; onImageClick?: (url: string) => void;
}) {
  const dialogRef = useDialog(onClose);
  const released = p.status === "RELEASED" || p.status === "COMPLETED";
  const prog = calcProgress(p.checkpoints);
  const dateLabel = formatDateSpan(p.startDate, p.endDate);

  return (
    <m.div
      className={s.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <div className={s.scrim} />
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        tabIndex={-1}
        className={s.dialog}
        /* Modals stay centred — transform-origin: center is correct here,
           unlike popovers, which should grow from their trigger. */
        initial={{ opacity: 0, scale: 0.96, transform: "translateY(8px)" }}
        animate={{ opacity: 1, scale: 1, transform: "translateY(0px)" }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={s.dialogHead}>
          <CardMedia p={p} color={color} height="13rem" onImageClick={onImageClick} />
          <div className={s.dialogTitleRow}>
            <h2>{p.title}</h2>
            <StatusPill released={released} prog={prog} color={color} />
          </div>
          <button onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close" className={`${s.dialogClose} pressable`}>
            <Icon name="close" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className={s.dialogBody}>
          {p.description && <p>{p.description}</p>}
          <div className={s.badgeRow} style={{ marginBlockEnd: 0 }}>
            {p.projectType && (
              <span className={s.badge} style={{ color, backgroundColor: `${color}14` }}>
                {PROJECT_TYPE_LABELS[p.projectType] || p.projectType}
              </span>
            )}
            {dateLabel && <span className={`${s.badge} ${s.badgeNeutral}`}>{dateLabel}</span>}
          </div>

          {p.techStack.filter(t => t.technologyName).length > 0 && (
            <div className={s.stack}>
              {p.techStack.filter(t => t.technologyName).map((t: TechStack, i: number) => (
                <span key={i} className={`${s.badge} ${s.badgeNeutral}`}>{t.technologyName}</span>
              ))}
            </div>
          )}

          {p.links.filter(l => l.url && l.url !== "#").length > 0 && (
            <div className={s.cardRow}>
              {p.links.filter(l => l.url && l.url !== "#").map((l: ProjectLink, i: number) => (
                <a key={i} href={ensureHttps(l.url)} target="_blank" rel="noopener noreferrer" className={`${s.outLink} pressable`}>
                  <BrandIcon type={l.type} size={15} />
                  {linkLabel(l.type)}
                </a>
              ))}
            </div>
          )}

          {p.checkpoints.length > 0 && (
            <div>
              <ProgressBar value={prog} color={prog === 100 ? "#2c6b46" : color} height={8} className={s.barSpace} />
              <div className={s.checkList}>
                {p.checkpoints.map((cp: Checkpoint, i: number) => (
                  <div key={i} className={s.checkRow} style={{ fontSize: "0.82rem" }}>
                    <span className={s.checkDot} style={{ backgroundColor: cp.isCompleted ? "#2c6b46" : "var(--t-line)" }} />
                    <span style={{ flex: 1, opacity: cp.isCompleted ? 1 : 0.55 }}>{cp.title}</span>
                    <span className={s.skillLevel}>{cp.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </m.div>
    </m.div>
  );
}

/* ═══════════════════════════════════════════════════════
   PortfolioView — UserInfo → SocialLinks → Skills → Projects
   ═══════════════════════════════════════════════════════ */
export default function PortfolioView({ profile, projects, skills = [], onLightbox }: {
  profile: Profile; projects: Project[]; skills?: Skill[]; onLightbox?: (url: string) => void;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [localLightbox, setLocalLightbox] = useState<string | null>(null);
  const theme = profile.theme ?? DEFAULT_THEME;
  const color = theme.colors.accent;
  const layout = profile.layoutStyle || "CLASSIC";
  const ts = getThemeStyles(theme);
  const cardSty = theme.cardStyle;

  const visibleProjects = projects.filter(p => p.visible !== false);
  const released = visibleProjects.filter(p => p.status === "RELEASED" || p.status === "COMPLETED");
  const inProgress = visibleProjects.filter(p => p.status === "IN_PROGRESS");

  const handleImageClick = (url: string) => {
    if (onLightbox) onLightbox(url);
    else setLocalLightbox(url);
  };

  const renderGrid = (items: Project[]) => {
    if (layout === "MINIMAL") {
      return (
        <div className={s.minimalList}>
          {items.map(p => <MinimalCard key={p.id} p={p} color={color} onClick={() => setSelectedProject(p)} onImageClick={handleImageClick} cardStyle={cardSty} />)}
        </div>
      );
    }
    if (layout === "CAROUSEL") {
      return (
        <div className={s.rail}>
          {items.map(p => <CarouselCard key={p.id} p={p} color={color} onClick={() => setSelectedProject(p)} onImageClick={handleImageClick} cardStyle={cardSty} />)}
        </div>
      );
    }
    return (
      <div className={s.grid}>
        {items.map(p => <ProjectCard key={p.id} p={p} color={color} onClick={() => setSelectedProject(p)} onImageClick={handleImageClick} cardStyle={cardSty} />)}
      </div>
    );
  };

  const renderProjects = () => {
    if (layout === "TIMELINE") {
      const sorted = [...visibleProjects].sort((a, b) => (b.startDate || "0000").localeCompare(a.startDate || "0000"));
      if (sorted.length === 0) return null;
      return (
        <section className={s.section}>
          <div className={s.timeline}>
            {sorted.map((p, i) => <TimelineNode key={p.id} p={p} color={color} onClick={() => setSelectedProject(p)} index={i} cardStyle={cardSty} />)}
          </div>
        </section>
      );
    }
    if (visibleProjects.length === 0) return null;
    return (
      <section className={s.section}>
        {released.length > 0 && (
          <div style={{ marginBlockEnd: "var(--space-xl)" }}>
            <div className={s.sectionHead}>
              <span style={{ color, display: "grid" }}><Icon name="checkCircle" size={16} strokeWidth={2.2} /></span>
              <h2>Completed</h2>
              <span className={s.count}>({released.length})</span>
            </div>
            {renderGrid(released)}
          </div>
        )}
        {inProgress.length > 0 && (
          <div>
            <div className={s.sectionHead}>
              <span className={s.checkDot} style={{ backgroundColor: color }} />
              <h2>In progress</h2>
              <span className={s.count}>({inProgress.length})</span>
            </div>
            {renderGrid(inProgress)}
          </div>
        )}
      </section>
    );
  };

  const themeVars = {
    "--theme-bg": theme.colors.background,
    "--theme-text": theme.colors.text,
    "--theme-accent": theme.colors.accent,
    "--theme-description": theme.colors.descriptionColor ?? theme.colors.text,
    "--theme-card": theme.colors.card ?? "#ffffff",
  } as React.CSSProperties;

  return (
    /* The public page needs reduced-motion support most of all — it is the
       one strangers land on. */
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <div
          className={s.root}
          style={{ ...ts.wrapperBg, ...textureCSS(theme.texture, color), ...getFontStyle(theme.fontFamily), ...themeVars }}
        >
          <AnimatePresence>{localLightbox && <ImageLightbox url={localLightbox} onClose={() => setLocalLightbox(null)} />}</AnimatePresence>
          <AnimatePresence>{selectedProject && <DetailModal p={selectedProject} color={color} onClose={() => setSelectedProject(null)} onImageClick={handleImageClick} />}</AnimatePresence>

          <div className={s.column}>
            <UserInfoSection profile={profile} color={color} />

            {profile.showLinks !== false && (
              <SocialLinksSection
                links={profile.socialLinks || []}
                layout={profile.socialLinksLayout || "ICONS"}
                color={color}
                buttonStyle={theme.buttonStyle}
                cardStyle={theme.cardStyle}
              />
            )}

            {profile.showSkills !== false && <SkillsSection skills={skills} color={color} cardStyle={theme.cardStyle} />}

            {profile.showProjects !== false && renderProjects()}
          </div>
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Reorder, AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import PortfolioView, { ImageLightbox } from "@/components/PortfolioView";
import { PROJECT_ICONS, Spinner } from "@/lib/icons";
import css from "./dashboard.module.css";
import OnboardingModal from "@/components/OnboardingModal";
import { markOwnerDevice, recordWebSession, dailySeries, todayKey } from "@/lib/insights";
import type { DeviceSession, VisitStats } from "@/lib/insights";
import { DEFAULT_THEME, DEFAULT_ACCENT, THEME_PRESETS } from "@/types/portfolio";
import type { ThemePreset, ThemeTexture, Theme, ThemeFont, CardStyle, ButtonStyle } from "@/types/portfolio";

/* ─── Constants ──────────────────────────────────────── */
const LAYOUT_OPTIONS = [
  { value: "CLASSIC" as const, label: "Classic Grid", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" },
  { value: "MINIMAL" as const, label: "Minimal List", icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" },
  { value: "CAROUSEL" as const, label: "Carousel", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v13.5a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 19.5V6zm9.75 0a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" },
  { value: "TIMELINE" as const, label: "Timeline", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
];

/* ─── Types ──────────────────────────────────────────── */
import type {
  Checkpoint,
  Project,
  SocialLink,
  Profile,
  Skill,
  SocialLinksLayout,
  UserInfoLayout,
} from "@/types/portfolio";

/* ─── Helpers ────────────────────────────────────────── */
function sorted(cps: Checkpoint[]): Checkpoint[] { return [...cps].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)); }

const VALID_TABS = ["profile", "links", "projects", "skills", "appearance"] as const;
type Tab = typeof VALID_TABS[number];
const TAB_LABELS: Record<Tab, string> = { profile: "Profile", links: "Links", projects: "Projects", skills: "Skills", appearance: "Appearance" };

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* Reordering was drag-only, which no keyboard or screen reader can do. */
function MoveButtons({ onMove, index, count, label }: { onMove: (to: number) => void; index: number; count: number; label: string }) {
  return (
    <span className={css.moveStack}>
      <button type="button" onClick={e => { e.stopPropagation(); onMove(index - 1); }} disabled={index === 0}
        aria-label={`Move ${label} up`} className={css.moveBtn}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true" width={12} height={12}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
      </button>
      <button type="button" onClick={e => { e.stopPropagation(); onMove(index + 1); }} disabled={index === count - 1}
        aria-label={`Move ${label} down`} className={css.moveBtn}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true" width={12} height={12}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
      </button>
    </span>
  );
}

/* Destructive confirmation without a blocking window.confirm(). Press is slow
   and deliberate; release snaps back fast. Sliding off the button cancels. */
function HoldToDelete({ onConfirm, label = "Delete Project" }: { onConfirm: () => void; label?: string }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); onConfirm(); }, 1600);
  };
  const cancel = () => {
    setHolding(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <button
      type="button"
      data-holding={holding}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={cancel}
      onBlur={cancel}
      className="hold-target btn btn--danger btn--sm"
    >
      <span className="hold-fill" aria-hidden="true" />
      <span style={{ position: "relative" }}>{holding ? "Keep holding…" : label}</span>
    </button>
  );
}

const defaultProfile: Profile = { fullName: "", title: "", bio: "", location: "", username: "", avatarUrl: "", showAvatar: true, theme: DEFAULT_THEME, socialLinks: [], socialLinksLayout: 'ICONS', userInfoLayout: 'LEFT', showLinks: true, showProjects: true, showSkills: true, portfolioVisibility: "ALL", layoutStyle: "CLASSIC", skills: [], userId: "", listedInDirectory: false };

/* ═════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  // Read after mount. Reading localStorage during the first render makes the
  // server's HTML and the client's first render disagree — a hydration mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("viefolio-active-tab");
      if ((VALID_TABS as readonly string[]).includes(saved ?? "")) setActiveTab(saved as Tab);
    } catch { /* ignore */ }
  }, []);
  const switchTab = (tab: Tab) => { setActiveTab(tab); try { localStorage.setItem("viefolio-active-tab", tab); } catch { /* ignore */ } };
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Toast notifications (replaces blocking alert() calls)
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string, type: "error" | "success" = "error") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // A toast that expires in a background tab was never actually read.
  useEffect(() => {
    if (!toast) return;
    const onVisibility = () => {
      if (document.hidden) {
        if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null; }
      } else if (!toastTimer.current) {
        toastTimer.current = setTimeout(() => setToast(null), 3500);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [toast]);

  // Profile state
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  // Serialized profile that Firestore is known to already hold. null until the
  // first snapshot arrives, which keeps autosave from firing on mount.
  const lastSavedRef = useRef<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedUsernameRef = useRef<string>("");

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteCodeSent, setDeleteCodeSent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Set the moment deletion succeeds. The profile listener is still live and
  // will fire once with a missing doc — without this it reads as "new user".
  const deletedRef = useRef(false);
  const [deleteError, setDeleteError] = useState("");

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectOrderChanged, setProjectOrderChanged] = useState(false);
  const [showReorder, setShowReorder] = useState(false);

  // Insights state
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[] | null>(null);

  // Account panel (avatar circle, top-right)
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [pwCode, setPwCode] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSignOutAll, setPwSignOutAll] = useState(true);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwCodeSent, setPwCodeSent] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Edit modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [projectImgUploading, setProjectImgUploading] = useState(false);
  const [editLightbox, setEditLightbox] = useState<string | null>(null);
  const backupCheckpoints = useRef<Checkpoint[]>([]);
  const [aiBusy, setAiBusy] = useState<"generate" | "percentages" | null>(null);

  /* ─── Escape closes the topmost modal ──────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editLightbox) setEditLightbox(null);
      else if (showAccountPanel && !pwSaving) setShowAccountPanel(false);
      else if (showThemeModal) setShowThemeModal(false);
      else if (showReorder) setShowReorder(false);
      else if (showDeleteModal && !deleting) setShowDeleteModal(false);
      else if (showMobilePreview) setShowMobilePreview(false);
      else if (editingProject) setEditingProject(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editLightbox, showAccountPanel, pwSaving, showThemeModal, showReorder, showDeleteModal, deleting, showMobilePreview, editingProject]);

  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);

  /* ─── Auth ─────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace("/login");
      else {
        setUser(u);
        setNeedsVerify(!u.emailVerified && u.providerData.some(p => p.providerId === "password"));
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [router]);

  async function sendVerifyCode() {
    if (!user) return;
    setVerifySending(true);
    try {
      const res = await fetch("/api/password-otp/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "EMAIL_VERIFY" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      setVerifyOpen(true);
      showToast("Code sent — check your email.", "success");
    } catch (err) {
      showToast(err instanceof Error && err.message ? err.message : "Couldn't send the code.");
    } finally {
      setVerifySending(false);
    }
  }

  async function confirmVerifyCode() {
    if (!user) return;
    setVerifySending(true);
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) {
        showToast((await res.json().catch(() => ({}))).error || "Couldn't verify that code.");
        return;
      }
      // Refresh the token so the rules see email_verified on the next write.
      await user.getIdToken(true);
      setNeedsVerify(false);
      setVerifyOpen(false);
      setVerifyCode("");
      showToast("Email verified — your portfolio is live.", "success");
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setVerifySending(false);
    }
  }

  /* ─── Email verification state ─────────────────────
     onAuthStateChanged hands back a cached user, and its emailVerified can be
     stale (it was for every account verified outside this browser). Reload
     before gating on it. */
  useEffect(() => {
    if (!user) return;
    user.reload()
      .then(() => setNeedsVerify(!user.emailVerified && user.providerData.some(p => p.providerId === "password")))
      .catch(() => {});
  }, [user]);

  /* ─── Device session + own-device visit exclusion ──── */
  useEffect(() => {
    if (!user) return;
    markOwnerDevice(user.uid);
    recordWebSession(user.uid);
  }, [user]);

  /* ─── Profile listener ─────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "profiles", user.uid), (snap) => {
      // Mid-deletion the server wipes this doc; nothing it reports is meaningful.
      if (deletedRef.current) return;
      if (snap.exists()) {
        const d = snap.data();
        // Migrate legacy themeColor → theme object
        const legacyCard = d.theme?.colors?.card ?? d.theme?.colors?.projectCard ?? DEFAULT_THEME.colors.card;
        // Every optional theme field needs a concrete default — Firestore
        // rejects writes containing undefined, which would break all saves.
        // 'SOFT' was removed with the old lavender palette — fold it into MINIMAL.
        const storedPreset = d.theme?.preset === 'SOFT' ? 'MINIMAL' : d.theme?.preset;
        const migratedTheme: Theme = d.theme ? { preset: storedPreset ?? 'MINIMAL', colors: { background: d.theme.colors?.background ?? DEFAULT_THEME.colors.background, card: legacyCard, accent: d.theme.colors?.accent ?? (d.themeColor ?? DEFAULT_ACCENT), text: d.theme.colors?.text ?? DEFAULT_THEME.colors.text, descriptionColor: d.theme.colors?.descriptionColor ?? DEFAULT_THEME.colors.descriptionColor }, texture: d.theme.texture ?? 'NONE', fontFamily: d.theme.fontFamily ?? 'SANS', cardStyle: d.theme.cardStyle ?? 'FLAT', buttonStyle: d.theme.buttonStyle ?? 'ROUNDED' } : { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors, accent: d.themeColor ?? DEFAULT_ACCENT } };
        // Migrate legacy socialLinks { github, linkedin, twitter } → SocialLink[]
        let migratedLinks: SocialLink[] = [];
        if (Array.isArray(d.socialLinks)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          migratedLinks = d.socialLinks.map((l: any) => ({ id: l.id ?? crypto.randomUUID(), type: l.type ?? 'CUSTOM', title: l.title ?? '', url: l.url ?? '', imageUrl: l.imageUrl ?? '', visible: l.visible ?? true }));
        } else if (d.socialLinks && typeof d.socialLinks === 'object') {
          const sl = d.socialLinks as Record<string, string>;
          if (sl.github) migratedLinks.push({ id: crypto.randomUUID(), type: 'GITHUB', title: 'GitHub', url: sl.github, visible: true });
          if (sl.linkedin) migratedLinks.push({ id: crypto.randomUUID(), type: 'LINKEDIN', title: 'LinkedIn', url: sl.linkedin, visible: true });
          if (sl.twitter) migratedLinks.push({ id: crypto.randomUUID(), type: 'TWITTER', title: 'Twitter', url: sl.twitter, visible: true });
        }
        savedUsernameRef.current = d.username ?? "";
        const next: Profile = {
          fullName: d.fullName ?? "", title: d.title ?? "", bio: d.bio ?? "",
          location: d.location ?? "", username: d.username ?? "",
          avatarUrl: d.avatarUrl ?? "", showAvatar: d.showAvatar ?? true,
          theme: migratedTheme,
          socialLinks: migratedLinks,
          socialLinksLayout: (d.socialLinksLayout as SocialLinksLayout) ?? 'ICONS',
          userInfoLayout: (d.userInfoLayout as UserInfoLayout) ?? 'LEFT',
          showLinks: d.showLinks ?? true,
          showProjects: d.showProjects ?? true,
          showSkills: d.showSkills ?? true,
          portfolioVisibility: d.portfolioVisibility ?? "ALL",
          listedInDirectory: d.listedInDirectory ?? false,
          layoutStyle: d.layoutStyle === 'LINK_IN_BIO' ? 'CLASSIC' : (d.layoutStyle ?? "CLASSIC"),
          // Saved as null (Firestore rejects undefined) — normalize it back, or
          // autosave sees null !== undefined and re-saves on a loop forever.
          accountType: d.accountType ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          skills: (d.skills ?? []).map((s: any) => ({ id: s.id ?? crypto.randomUUID(), name: s.name ?? "", level: s.level ?? 50, visible: s.visible ?? true })),
          userId: user.uid,
        };
        // Autosave compares against this. Marking the server's own echo as
        // "already saved" is what stops save → snapshot → save from looping.
        lastSavedRef.current = JSON.stringify(next);
        setProfile(next);
        if (!d.accountType) setShowOnboarding(true);
        else setShowOnboarding(false);
      } else {
        savedUsernameRef.current = "";
        const blank = { ...defaultProfile, userId: user.uid };
        lastSavedRef.current = JSON.stringify(blank);
        setProfile(blank);
        setShowOnboarding(true);
      }
    }, (err) => console.debug("profile listener closed:", err.code));
    return () => unsub();
  }, [user]);

  /* ─── Debounced username check ─────────────────────── */
  const checkUsername = useCallback((val: string) => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    if (!val || val.length < 2) { setUsernameStatus("idle"); setUsernameSuggestions([]); return; }
    setUsernameStatus("checking");
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, "usernames", val));
        let taken = snap.exists() && snap.data()?.userId !== user?.uid;
        if (!snap.exists()) {
          // Legacy fallback: profiles saved before username reservations existed
          const legacy = await getDocs(query(collection(db, "profiles"), where("username", "==", val)));
          taken = legacy.docs.some(d => d.id !== user?.uid);
        }
        if (taken) {
          setUsernameStatus("taken");
          setUsernameSuggestions([`${val}-dev`, `${val}-portfolio`, `${val}hq`]);
        } else {
          setUsernameStatus("available");
          setUsernameSuggestions([]);
        }
      } catch { setUsernameStatus("idle"); }
    }, 500);
  }, [user]);

  /* ─── Projects listener ────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "projects"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs: Project[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? data.name ?? "Untitled",
          description: data.description ?? "",
          status: ((data.status ?? "IN_PROGRESS").toUpperCase() === "COMPLETED" ? "RELEASED" : (data.status ?? "IN_PROGRESS").toUpperCase()) as Project["status"],
          imageUrl: data.imageUrl ?? "",
          imageUrls: data.imageUrls ?? (data.imageUrl ? [data.imageUrl] : []),
          showImage: data.showImage ?? false,
          icon: data.icon ?? "Code",
          projectType: (data.projectType ?? "SOLO") as Project["projectType"],
          startDate: data.startDate ?? "",
          endDate: data.endDate ?? (data.dateSpan ? "" : ""),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          techStack: (data.techStack ?? []).map((t: any) => ({ id: t.id ?? crypto.randomUUID(), technologyName: typeof t === "string" ? t : (t.technologyName ?? t.name ?? "") })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          checkpoints: (data.checkpoints ?? []).map((cp: any, idx: number) => ({ id: cp.id ?? `cp-${idx}`, title: cp.title ?? "", percentage: cp.percentage ?? 0, isCompleted: cp.isCompleted ?? false, orderIndex: cp.orderIndex ?? idx })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          links: (data.links ?? []).map((l: any) => ({ id: l.id ?? crypto.randomUUID(), type: l.type ?? "WEBSITE", url: l.url ?? l.link ?? "#" })),
          // Both were written but never read back, so every snapshot reset them
          // to undefined — which is what made the first visibility click look
          // like it did nothing, and lost the saved reorder.
          visible: data.visible ?? true,
          orderIndex: data.orderIndex ?? 0,
          userId: data.userId ?? "",
        };
      });
      docs.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setProjects(docs);
      if (docs.length > 0 && !docs.find(d => d.id === selectedId)) setSelectedId(docs[0].id);
    }, (err) => console.debug("projects listener closed:", err.code));
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ─── Insights listeners (visit stats + devices) ───── */
  useEffect(() => {
    if (!user) return;
    const unsubStats = onSnapshot(doc(db, "stats", user.uid), (snap) => {
      const d = snap.data();
      setVisitStats({
        totalVisits: (d?.totalVisits as number) ?? 0,
        daily: (d?.daily as Record<string, number>) ?? {},
        lastVisitAt: d?.lastVisitAt ?? null,
      });
    }, (err) => console.debug("stats listener closed:", err.code));
    const unsubSessions = onSnapshot(collection(db, "profiles", user.uid, "sessions"), (snap) => {
      const docs: DeviceSession[] = snap.docs.map((s) => {
        const d = s.data();
        return {
          id: s.id,
          platform: d.platform ?? "WEB",
          deviceModel: d.deviceModel ?? "Unknown device",
          osVersion: d.osVersion ?? "",
          location: d.location ?? "",
          lastSignIn: d.lastSignIn ?? null,
        };
      });
      docs.sort((a, b) => (b.lastSignIn?.seconds ?? 0) - (a.lastSignIn?.seconds ?? 0));
      setDeviceSessions(docs);
    }, (err) => console.debug("sessions listener closed:", err.code));
    return () => { unsubStats(); unsubSessions(); };
  }, [user]);

  /* ─── Change password: email code verifies inbox access ─ */
  async function requestPasswordCode() {
    if (!user) return;
    setPwError(""); setPwSuccess("");
    if (pwNew.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("New passwords don't match."); return; }
    setPwSaving(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/password-otp/request", { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPwError(data.error ?? "Couldn't send the code. Try again."); return; }
      setPwCodeSent(true);
      setPwSuccess(`Code sent to ${user.email}. It expires in 10 minutes.`);
    } catch {
      setPwError("Couldn't send the code. Try again.");
    } finally {
      setPwSaving(false);
    }
  }

  async function confirmPasswordChange() {
    if (!user?.email) return;
    setPwError(""); setPwSuccess("");
    setPwSaving(true);
    try {
      const idToken = await user.getIdToken();
      const deviceId = localStorage.getItem("viefolio-device-id") ?? "";
      const res = await fetch("/api/password-otp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: pwCode, newPassword: pwNew, signOutOtherDevices: pwSignOutAll, keepSessionId: `web-${deviceId}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPwError(data.error ?? "Couldn't change the password."); return; }
      // Server-side password change revokes this session's tokens too — sign in fresh
      await signInWithEmailAndPassword(auth, user.email, pwNew);
      setPwCode(""); setPwNew(""); setPwConfirm(""); setPwCodeSent(false);
      setPwSuccess(pwSignOutAll ? "Password changed. Other devices are being signed out." : "Password changed.");
    } catch {
      setPwError("Password was changed, but re-signing in failed — please sign in again.");
    } finally {
      setPwSaving(false);
    }
  }

  /* ─── Save Profile ─────────────────────────────────── */
  const saveProfile = useCallback(async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const payload = {
        fullName: profile.fullName, title: profile.title, bio: profile.bio,
        location: profile.location, username: profile.username,
        avatarUrl: profile.avatarUrl, showAvatar: profile.showAvatar,
        theme: profile.theme,
        socialLinks: profile.socialLinks.map(l => ({ id: l.id, type: l.type, title: l.title, url: l.url, imageUrl: l.imageUrl ?? '', visible: l.visible ?? true })),
        socialLinksLayout: profile.socialLinksLayout,
        userInfoLayout: profile.userInfoLayout,
        showLinks: profile.showLinks ?? true,
        showProjects: profile.showProjects ?? true,
        showSkills: profile.showSkills ?? true,
        portfolioVisibility: profile.portfolioVisibility,
        listedInDirectory: !!profile.listedInDirectory,
        layoutStyle: profile.layoutStyle,
        // Firestore rejects undefined — use null when onboarding hasn't run yet
        accountType: profile.accountType ?? null,
        skills: profile.skills.map(s => ({ id: s.id, name: s.name, level: s.level, visible: s.visible ?? true })),
        userId: user.uid,
      };
      // Transaction: claim usernames/{username} (doc ID = username) atomically
      // so two accounts can never end up with the same subdomain.
      const newUsername = profile.username;
      const oldUsername = savedUsernameRef.current;
      // Legacy guard: usernames saved before reservations existed live only on
      // profile docs, which a transaction can't query — check them up front.
      if (newUsername && newUsername !== oldUsername) {
        const legacy = await getDocs(query(collection(db, "profiles"), where("username", "==", newUsername)));
        if (legacy.docs.some(d => d.id !== user.uid)) throw new Error("USERNAME_TAKEN");
      }
      await runTransaction(db, async (tx) => {
        // All reads must happen before any writes
        const newRes = newUsername ? await tx.get(doc(db, "usernames", newUsername)) : null;
        const oldRes = oldUsername && oldUsername !== newUsername ? await tx.get(doc(db, "usernames", oldUsername)) : null;
        if (newRes?.exists() && newRes.data()?.userId !== user.uid) {
          throw new Error("USERNAME_TAKEN");
        }
        if (newUsername && !newRes?.exists()) {
          tx.set(doc(db, "usernames", newUsername), { userId: user.uid });
        }
        if (oldRes?.exists() && oldRes.data()?.userId === user.uid) {
          tx.delete(doc(db, "usernames", oldUsername));
        }
        tx.set(doc(db, "profiles", user.uid), payload, { merge: true });
      });
      savedUsernameRef.current = newUsername;
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.message === "USERNAME_TAKEN") {
        setUsernameStatus("taken");
        setUsernameSuggestions([`${profile.username}-dev`, `${profile.username}-portfolio`, `${profile.username}hq`]);
        showToast(`"${profile.username}" is already taken — try one of the suggestions.`);
      } else {
        console.error("Profile save error:", err);
        showToast("Failed to save profile. Please try again.");
      }
    } finally {
      setProfileSaving(false);
    }
  }, [user, profile, showToast]);

  /* ─── Autosave ─────────────────────────────────────
     Edits commit themselves ~1s after you stop changing things, so the panes
     don't need Save buttons. */
  useEffect(() => {
    if (!user || lastSavedRef.current === null) return;
    // ponytail: dirty-check is JSON.stringify, so it's key-order sensitive. It
    // holds because every profile object descends from the listener's shape.
    // If a future edit builds a Profile from scratch, switch to a field compare.
    const snapshot = JSON.stringify(profile);
    if (snapshot === lastSavedRef.current) return;
    // A pending or taken username would fail the save transaction and toast on
    // every keystroke — hold until the check settles.
    if (usernameStatus === "checking" || usernameStatus === "taken") return;
    const t = setTimeout(() => {
      lastSavedRef.current = snapshot;
      saveProfile();
    }, 1000);
    return () => clearTimeout(t);
  }, [profile, user, usernameStatus, saveProfile]);

  /* ─── Save Edited Project ──────────────────────────── */
  async function saveEditedProject() {
    if (!editingProject) return;
    setEditSaving(true);
    try {
      // Filter out empty-named checkpoints
      const validCheckpoints = editingProject.checkpoints.filter(cp => cp.title.trim() !== "");
      const payload = {
        title: editingProject.title,
        description: editingProject.description,
        status: editingProject.status,
        // imageUrl mirrors the cover so the iOS app and older data keep working.
        imageUrl: editingProject.imageUrls?.[0] ?? editingProject.imageUrl,
        imageUrls: editingProject.imageUrls ?? [],
        showImage: editingProject.showImage,
        icon: editingProject.icon,
        projectType: editingProject.projectType,
        startDate: editingProject.startDate,
        endDate: editingProject.endDate,
        techStack: editingProject.techStack.map(t => ({ id: t.id, technologyName: t.technologyName })),
        checkpoints: validCheckpoints.map(cp => ({ id: cp.id, title: cp.title, percentage: cp.percentage, isCompleted: cp.isCompleted, orderIndex: cp.orderIndex })),
        links: editingProject.links.map(l => ({ id: l.id, type: l.type, url: l.url })),
        userId: editingProject.userId,
      };
      if (editingProject.id.startsWith("new_")) {
        // New project — create in Firestore
        await addDoc(collection(db, "projects"), payload);
      } else {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
      }
      setEditingProject(null);
    } catch (err) {
      console.error("Project save error:", err);
      showToast("Failed to save project. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  /* ─── Delete Project ──────────────────────────────── */
  async function deleteProject(projectId: string) {
    try {
      if (!projectId.startsWith("new_")) {
        await deleteDoc(doc(db, "projects", projectId));
      }
      setEditingProject(null);
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete project.");
    }
  }

  async function handleSignOut() { await signOut(auth); router.replace("/login"); }

  /* ─── Delete Account ───────────────────────────────── */
  const isPasswordUser = user?.providerData.some(p => p.providerId === "password") ?? false;

  async function requestDeleteCode() {
    if (!user) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/password-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ purpose: "DELETE_ACCOUNT" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setDeleteError(data.error ?? "Couldn't send the code. Try again."); return; }
      setDeleteCodeSent(true);
    } catch {
      setDeleteError("Couldn't send the code. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    setDeleteError("");
    // Before the request, not after: the server wipes the profile doc while
    // this is still in flight, and the live listener sees that missing doc as
    // a brand-new user and opens onboarding. Cleared again if we don't delete.
    deletedRef.current = true;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: deleteCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        deletedRef.current = false;
        setDeleteError(data.error ?? "Couldn't delete the account. Try again.");
        return;
      }
      // Server removed the auth user and all data; drop the local session
      await signOut(auth).catch(() => {});
      router.replace("/");
    } catch {
      deletedRef.current = false;
      setDeleteError("Something went wrong deleting your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ─── AI checkpoints (Gemini, via /api/ai/checkpoints) ─ */
  async function runAI(mode: "generate" | "percentages") {
    if (!user || !editingProject) return;
    setAiBusy(mode);
    try {
      const res = await fetch("/api/ai/checkpoints", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(mode === "generate"
          ? {
              mode,
              title: editingProject.title,
              description: editingProject.description,
              techStack: editingProject.techStack.map(t => t.technologyName),
              links: editingProject.links.map(l => ({ type: l.type, url: l.url })),
            }
          : {
              mode,
              titles: sorted(editingProject.checkpoints).map(c => c.title.trim()).filter(Boolean),
            }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error ?? "The AI request failed. Try again."); return; }

      if (mode === "generate") {
        setEditingProject(prev => prev && ({
          ...prev,
          checkpoints: data.checkpoints.map((c: Checkpoint, i: number) => ({ ...c, id: crypto.randomUUID(), orderIndex: i })),
        }));
        showToast("Checkpoints generated.", "success");
      } else {
        // Percentages come back aligned to the sorted, non-empty titles we sent.
        const order = sorted(editingProject.checkpoints).filter(c => c.title.trim());
        const byId = new Map(order.map((c, i) => [c.id, data.percentages[i] as number]));
        setEditingProject(prev => prev && ({
          ...prev,
          checkpoints: prev.checkpoints.map(c => byId.has(c.id) ? { ...c, percentage: byId.get(c.id)! } : c),
        }));
        showToast("Percentages generated.", "success");
      }
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setAiBusy(null);
    }
  }

  /* ─── Save Project Order ───────────────────────────── */
  async function saveProjectOrder() {
    try {
      await Promise.all(projects.map(p => updateDoc(doc(db, "projects", p.id), { orderIndex: p.orderIndex })));
      setProjectOrderChanged(false);
      showToast("Project order saved.", "success");
    } catch (err) {
      console.error("Order save error:", err);
      showToast("Failed to save project order.");
    }
  }

  /* ─── Create New Project ────────────────────── */
  function createNewProject() {
    if (!user) return;
    const newProj: Project = {
      id: "new_" + crypto.randomUUID(),
      title: "", description: "", status: "IN_PROGRESS",
      imageUrl: "", imageUrls: [], showImage: false, icon: "Code",
      projectType: "SOLO", startDate: "", endDate: "",
      techStack: [], checkpoints: [], links: [], userId: user.uid,
    };
    backupCheckpoints.current = [];
    setEditingProject(newProj);
  }

  /* ─── Avatar Upload ─────────────────────────────── */
  async function uploadAvatar(file: File) {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile(p => ({ ...p, avatarUrl: url }));
      await setDoc(doc(db, "profiles", user.uid), { avatarUrl: url }, { merge: true });
    } catch (err) { console.error("Avatar upload error:", err); }
    finally { setAvatarUploading(false); }
  }

  /* ─── Project Image Upload ──────────────────────── */
  async function uploadProjectImages(files: File[], projectId: string) {
    if (!user || files.length === 0) return;
    setProjectImgUploading(true);
    try {
      // Path embeds the owner's uid so storage rules can verify ownership
      const urls = await Promise.all(files.map(async (file) => {
        const storageRef = ref(storage, `project-images/${user.uid}/${projectId}/${crypto.randomUUID()}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      }));
      setEditingProject(prev => {
        if (!prev || prev.id !== projectId) return prev;
        const next = [...(prev.imageUrls ?? (prev.imageUrl ? [prev.imageUrl] : [])), ...urls];
        return { ...prev, imageUrls: next, imageUrl: next[0] };
      });
    } catch (err) { console.error("Project image upload error:", err); }
    finally { setProjectImgUploading(false); }
  }

  function removeProjectImage(url: string) {
    setEditingProject(prev => {
      if (!prev) return prev;
      const next = (prev.imageUrls ?? (prev.imageUrl ? [prev.imageUrl] : [])).filter(u => u !== url);
      return { ...prev, imageUrls: next, imageUrl: next[0] ?? "" };
    });
  }

  const displayName = profile.fullName || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayTitle = profile.title || "Viefolio User";

  if (authLoading) return (
    <div className={css.boot}>
      <div className={css.bootInner}>
        <div className={css.ringSpinner} />
        <span className={css.metaSm}>Loading…</span>
      </div>
    </div>
  );
  if (!user) return null;

  if (needsVerify) return (
    <div className={css.boot}>
      <div className={`${css.bootInner} ${css.verifyGate}`}>
        <h1>Verify your email</h1>
        <p className={css.metaSm}>
          Enter the 6-digit code we sent to <strong>{user.email}</strong> to unlock your dashboard.
        </p>
        {verifyOpen ? (
          <>
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
              value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              className={`input ${css.codeInput}`} autoFocus
            />
            <button type="button" className="btn btn--primary btn--block" onClick={confirmVerifyCode} disabled={verifySending || verifyCode.length !== 6}>
              {verifySending ? "Verifying…" : "Verify email"}
            </button>
            <button type="button" className="btn btn--quiet btn--sm btn--block" onClick={sendVerifyCode} disabled={verifySending}>
              Didn&apos;t get it? Resend
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={sendVerifyCode} disabled={verifySending}>
            {verifySending ? "Sending…" : "Send me a code"}
          </button>
        )}
        <button type="button" className="btn btn--quiet btn--sm btn--block" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );

  /* ═══ RENDER ═══════════════════════════════════════════ */
  return (
    <MotionConfig reducedMotion="user">
    <div className={css.app}>
      {/* ─── Toast ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, transform: "translateX(-50%) translateY(12px)" }}
            animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-50%) translateY(6px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className={css.toast} data-tone={toast.type}
            role="status"
          >
            {toast.type === "success" ? (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={16} height={16} className="noshrink"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="noshrink"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{editLightbox && <ImageLightbox url={editLightbox} onClose={() => setEditLightbox(null)} />}</AnimatePresence>
      {/* ─── ACCOUNT PANEL (avatar circle) ───────────────── */}
      <AnimatePresence>
      {showAccountPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={css.drawerScrim}
          onClick={() => !pwSaving && setShowAccountPanel(false)}
        >
          <motion.div
            initial={{ transform: "translateX(100%)" }}
            animate={{ transform: "translateX(0%)" }}
            exit={{ transform: "translateX(100%)" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Account and insights"
            onClick={e => e.stopPropagation()}
            className={css.drawer}
          >
            {/* Panel header */}
            <div className={css.drawerHead}>
              <div className={css.avatarBtn}>
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={displayName} className={css.avatarImg} />
                ) : (
                  <div className={css.avatarLetter}>{displayName.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="grow">
                <p className={`${css.strongSm} truncate`}>{displayName}</p>
                <p className={`${css.metaXs} truncate`}>{user?.email}</p>
              </div>
              <button onClick={() => !pwSaving && setShowAccountPanel(false)} className={css.iconBtn}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink-2)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className={css.drawerBody}>
              {/* ── Insights ── */}
              <div>
                <h3 className={css.strongSm}>Insights</h3>
                <p className={css.metaXs}>Portfolio visits — your own devices aren&apos;t counted.</p>
                {visitStats === null ? (
                  <div className="col">
                    <div className="grid-3">
                      {[0, 1, 2].map(i => <div key={i} className={`skeleton ${css.skeletonStat}`} />)}
                    </div>
                    <div className={`skeleton ${css.skeletonChart}`} />
                  </div>
                ) : (
                  <div className="col">
                    <div className="grid-3">
                      {[
                        { label: "Total", value: visitStats.totalVisits },
                        { label: "Today", value: visitStats.daily?.[todayKey()] ?? 0 },
                        { label: "7 days", value: dailySeries(visitStats.daily ?? {}, 7).reduce((s, d) => s + d.count, 0) },
                      ].map(card => (
                        <div key={card.label} className={css.stat}>
                          <p className={css.statValue}>{card.value}</p>
                          <p className={css.meta2Xs}>{card.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className={css.chart}>
                      {(() => {
                        const series = dailySeries(visitStats.daily ?? {}, 7);
                        const max = Math.max(1, ...series.map(d => d.count));
                        return (
                          <div className={css.bars}>
                            {series.map((d, i) => (
                              <div key={d.key} className={css.barCol}>
                                <span className={css.barValue}>{d.count > 0 ? d.count : ""}</span>
                                <div className={`${css.bar} bar-grow`} style={{ height: `${Math.max(4, (d.count / max) * 64)}px`, animationDelay: `${i * 40}ms`, background: d.count > 0 ? "linear-gradient(180deg, var(--ink), var(--ink-3))" : "var(--paper-sunk)" }} />
                                <span className={css.barLabel}>{d.label}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Devices ── */}
              <div>
                <h3 className={css.strongSm}>Signed-in devices</h3>
                {deviceSessions === null ? (
                  <div className="col">
                    {[0, 1].map(i => <div key={i} className={`skeleton ${css.skeletonRow}`} />)}
                  </div>
                ) : deviceSessions.length === 0 ? (
                  <p className={`${css.metaXs} ${css.emptyNote}`}>No devices recorded yet.</p>
                ) : (
                  <div className="col">
                    {deviceSessions.map(session => (
                      <div key={session.id} className={css.device}>
                        <div className={css.deviceIcon}>
                          {session.platform === "IOS" ? (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/></svg>
                          ) : (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"/></svg>
                          )}
                        </div>
                        <div className="grow">
                          <p className={`${css.strongXs} truncate`}>{session.deviceModel}{session.osVersion ? ` · ${session.osVersion}` : ""}</p>
                          <p className={`${css.metaXs} truncate`}>
                            {[session.location, session.lastSignIn ? new Date(session.lastSignIn.seconds * 1000).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Security ── */}
              <div className={css.toggleRow}>
                  <div>
                    <p>List in the Explore directory</p>
                    <p>Show your portfolio on viefolio.com/explore. Off by default, reversible any time.</p>
                  </div>
                  <button
                    onClick={() => setProfile(p => ({...p, listedInDirectory: !p.listedInDirectory}))}
                    className="switch"
                    data-on={!!profile.listedInDirectory}
                    role="switch"
                    aria-checked={!!profile.listedInDirectory}
                    aria-label="List in the Explore directory"
                  >
                    <span className="switch__knob" />
                  </button>
                </div>
              {isPasswordUser && (
                <div>
                  <button
                    onClick={() => setShowPwForm(v => !v)}
                    className="btn btn--outline btn--block row--between"
                  >
                    Change password
                    <svg className={css.chevron} data-open={showPwForm} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                  </button>
                  {showPwForm && (
                  <div className="col">
                    <input type="password" autoComplete="new-password" placeholder="New password (min 6 characters)" value={pwNew} onChange={e => setPwNew(e.target.value)} disabled={pwCodeSent}
                      className="input"/>
                    <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} disabled={pwCodeSent}
                      className="input" data-invalid={!!pwConfirm && pwConfirm !== pwNew}/>
                    <label className={`row ${css.checkLabel}`}>
                      <input type="checkbox" checked={pwSignOutAll} onChange={e => setPwSignOutAll(e.target.checked)} className="check"/>
                      <span className={css.metaXs}>Sign out of all other devices</span>
                    </label>
                    {!pwCodeSent ? (
                      <button
                        onClick={requestPasswordCode}
                        disabled={pwSaving || pwNew.length < 6 || pwNew !== pwConfirm}
                        className="btn btn--primary btn--block"
                       
                      >
                        {pwSaving ? "Sending code…" : "Email Me a Verification Code"}
                      </button>
                    ) : (
                      <>
                        <input
                          inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
                          value={pwCode} onChange={e => setPwCode(e.target.value.replace(/\D/g, ""))}
                          className={`input ${css.codeInput}`}/>
                        <button
                          onClick={confirmPasswordChange}
                          disabled={pwSaving || pwCode.length !== 6}
                          className="btn btn--primary btn--block"
                         
                        >
                          {pwSaving ? "Updating…" : "Confirm & Change Password"}
                        </button>
                        <button onClick={() => { setPwCodeSent(false); setPwCode(""); setPwSuccess(""); }} disabled={pwSaving}
                          className="btn btn--quiet btn--sm btn--block">
                          Didn&apos;t get it? Edit & resend
                        </button>
                      </>
                    )}
                    {pwError && <p className={`${css.metaXs} ${css.dangerText}`}>{pwError}</p>}
                    {pwSuccess && <p className={`${css.metaXs} ${css.successText}`}>{pwSuccess}</p>}
                  </div>
                  )}
                </div>
              )}
              {!isPasswordUser && (
                <div>
                  <h3 className={css.strongSm}>Password</h3>
                  <p className={css.metaXs}>
                    You sign in with {user?.providerData[0]?.providerId === "apple.com" ? "Apple" : "Google"}, so there&apos;s no Viefolio password to change — your account is secured by your provider.
                  </p>
                </div>
              )}

              {/* ── Danger Zone ── */}
              <div className={css.divideTop}>
                <h3 className={`${css.strongXs} ${css.dangerText}`}>Danger Zone</h3>
                <p className={css.metaXs}>Permanently delete your account, portfolio, projects, and images. This cannot be undone.</p>
                <button
                  onClick={() => { setDeleteConfirmText(""); setDeleteCode(""); setDeleteCodeSent(false); setDeleteError(""); setShowDeleteModal(true); }}
                  className={`btn btn--danger btn--block ${css.dangerOutline}`}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ─── DELETE ACCOUNT MODAL ────────────────────────── */}
      <AnimatePresence>
      {showDeleteModal && (() => {
        const confirmPhrase = profile.username || "DELETE";
        const canDelete = deleteConfirmText === confirmPhrase && !deleting;
        return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={css.scrim}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className={`${css.dialog} ${css.dialogNarrow}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={css.dialogBody}>
              <div className={`${css.emptyIcon} ${css.dangerIcon}`}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20} style={{ color: "var(--danger)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
              </div>
              <h3 className={css.strongMd}>Delete your account?</h3>
              <p className={css.metaXs}>
                This permanently deletes your portfolio{profile.username ? <> at <span className="font-semibold">{profile.username}.viefolio.com</span></> : ""}, all {projects.length} project{projects.length !== 1 ? "s" : ""}, images, and your login. <span className={css.dangerText}>This cannot be undone.</span>
              </p>
              <label className="label">Type <span className={`mono ${css.dangerText}`}>{confirmPhrase}</span> to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={confirmPhrase}
                className="input"
              />
              {deleteCodeSent && (
                <>
                  <label className="label">Enter the 6-digit code we emailed you</label>
                  <input
                    inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
                    value={deleteCode}
                    onChange={e => setDeleteCode(e.target.value.replace(/\D/g, ""))}
                    className={`input ${css.codeInput}`}
                  />
                </>
              )}
              {!deleteCodeSent && (
                <p className={css.metaXs}>We&apos;ll email a verification code to confirm it&apos;s really you — an open session alone can&apos;t delete this account.</p>
              )}
              {deleteError && (
                <div className="note">
                  <p className={`${css.metaXs} ${css.dangerText}`}>{deleteError}</p>
                </div>
              )}
              <div className="row">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn--outline grow">Cancel</button>
                <button
                  onClick={deleteCodeSent ? deleteAccount : requestDeleteCode}
                  disabled={!canDelete || (deleteCodeSent && deleteCode.length !== 6)}
                  className="btn btn--dangerSolid grow"
                >
                  {deleting ? (deleteCodeSent ? "Deleting…" : "Sending code…") : (deleteCodeSent ? "Delete Forever" : "Email Me a Code")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        );
      })()}
      </AnimatePresence>
      {/* ─── EDIT MODAL ──────────────────────────────────── */}
      <AnimatePresence>
      {editingProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={css.scrim}
          onClick={() => setEditingProject(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className={css.dialog}
            onClick={e => e.stopPropagation()}
          >
            <div className={css.dialogHead}>
              <h3 className={css.strongMd}>Edit Project</h3>
              <button onClick={() => setEditingProject(null)} className={css.iconBtn}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className={css.dialogBody}>
              {/* Title */}
              <div>
                <label className="label">Project Title</label>
                <input type="text" value={editingProject.title} onChange={e => setEditingProject({...editingProject, title: e.target.value})} placeholder="e.g. My Awesome App" className="input"/>
              </div>
              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea value={editingProject.description} onChange={e => setEditingProject({...editingProject, description: e.target.value})} placeholder="Describe your project…" rows={2} className="textarea"/>
              </div>
              {/* Status */}
              <div>
                <label className="label">Status</label>
                <div className="row">
                  {([{v:"IN_PROGRESS",l:"In Progress"},{v:"RELEASED",l:"Completed"}] as const).map(s => (
                    <button key={s.v} onClick={() => {
                      const prev = editingProject.status;
                      const next = s.v;
                      let nextCps = editingProject.checkpoints;
                      if (prev === "IN_PROGRESS" && next === "RELEASED") {
                        backupCheckpoints.current = editingProject.checkpoints.map(c => ({...c}));
                        nextCps = editingProject.checkpoints.map(c => ({...c, isCompleted: true}));
                      } else if (prev === "RELEASED" && next === "IN_PROGRESS" && backupCheckpoints.current.length > 0) {
                        nextCps = backupCheckpoints.current.map(c => ({...c}));
                      }
                      setEditingProject({...editingProject, status: next, checkpoints: nextCps});
                    }} className="chip chip--grow" data-active={editingProject.status===s.v}>{s.l}</button>
                  ))}
                </div>
              </div>
              {/* Project Type */}
              <div>
                <label className="label">Project Type</label>
                <div className="row row--wrap">
                  {([
                    {v:"SOLO",l:"Solo"},{v:"TEAM",l:"Team"},{v:"PERSONAL",l:"Personal"},
                    {v:"FREELANCE",l:"Freelance"},{v:"CLIENT",l:"Client"},{v:"COMMISSION",l:"Commission"},
                    {v:"OPEN_SOURCE",l:"Open Source"},{v:"INTERNSHIP",l:"Internship"},{v:"ACADEMIC",l:"Academic"}
                  ] as const).map(t => (
                    <button key={t.v} onClick={() => setEditingProject({...editingProject, projectType: t.v})} className="chip" data-active={editingProject.projectType===t.v}>{t.l}</button>
                  ))}
                </div>
              </div>
              {/* Date Range */}
              <div>
                <label className="label">Date Range</label>
                <div className="row">
                  <input type="date" value={editingProject.startDate} onChange={e => setEditingProject({...editingProject, startDate: e.target.value})} className="input input--sm grow"/>
                  <span className={css.metaXs}>to</span>
                  {editingProject.endDate === "present" ? (
                    <div className={`input input--sm grow ${css.codePreview}`}>Present</div>
                  ) : (
                    <input type="date" value={editingProject.endDate} onChange={e => setEditingProject({...editingProject, endDate: e.target.value})} className="input input--sm grow"/>
                  )}
                </div>
                <div className="row">
                  <button onClick={() => setEditingProject({...editingProject, endDate: editingProject.endDate === "present" ? "" : "present"})} className="chip chip--sm" data-active={editingProject.endDate === "present"}>Ongoing / Present</button>
                </div>
              </div>
              {/* Image Upload */}
              <div>
                <label className="label">Project Images <span className="quiet">(first one is the cover)</span></label>
                <div className="row">
                  {(editingProject.imageUrls ?? []).map(url => (
                    <div key={url} className={`${css.thumbBox} img-zone`} onClick={() => setEditLightbox(url)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="zoom-img w-full h-full object-cover"/>
                      <div className="img-overlay"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} style={{ color: "currentColor" }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"/></svg></div>
                      <button
                        onClick={e => { e.stopPropagation(); removeProjectImage(url); }}
                        aria-label="Remove image"
                        className={css.thumbRemove}
                      >
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor" width={12} height={12}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {(editingProject.imageUrls ?? []).length === 0 && (
                    <div className={css.thumbBox}>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M6.75 12.75h.008v.008H6.75v-.008z"/></svg>
                    </div>
                  )}
                  <label className="chip chip--file" aria-disabled={projectImgUploading}>
                    {projectImgUploading ? "Uploading…" : "Upload Images"}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadProjectImages(fs, editingProject.id); e.target.value = ""; }}/>
                  </label>
                </div>
              </div>
              {/* Show Image + Icon Selector */}
              <div className={css.toggleRow}>
                <div><p className={css.strongXs}>Show project image</p><p className={css.meta2Xs}>Display cover image on portfolio</p></div>
                <button onClick={() => setEditingProject({...editingProject, showImage: !editingProject.showImage})} className="switch" data-on={editingProject.showImage} role="switch" aria-checked={!!editingProject.showImage} aria-label="Show project image">
                  <span className="switch__knob"/>
                </button>
              </div>
              {/* Icon (fallback when no image) */}
              <div>
                <label className="label">Icon <span className="quiet">(shown when image is hidden)</span></label>
                <div className="row">
                  {PROJECT_ICONS.map(ic => (
                    <button key={ic.name} onClick={() => setEditingProject({...editingProject, icon: ic.name})} className="chip chip--icon" data-active={editingProject.icon === ic.name} title={ic.name}>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d={ic.icon}/></svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="label">Tech Stack <span className="quiet">(comma separated)</span></label>
                <input type="text" defaultValue={editingProject.techStack.map(t => t.technologyName).join(", ")} onBlur={e => { const names = e.target.value.split(",").map(s => s.trim()).filter(Boolean); setEditingProject({...editingProject, techStack: names.map((n, i) => ({ id: editingProject.techStack[i]?.id ?? crypto.randomUUID(), technologyName: n }))}); }} placeholder="e.g. React, Figma, Final Cut Pro, Notion" className="input"/>
              </div>
              {/* Checkpoints */}
              <div>
                <div className="row row--between">
                  <label className="label">Checkpoints</label>
                  <div className="row">
                    <button
                      onClick={() => runAI("generate")}
                      disabled={!!aiBusy || !editingProject.title.trim()}
                      title={editingProject.title.trim() ? "Replaces the list below" : "Add a title first"}
                      className={css.linkXs}
                    >
                      {aiBusy === "generate" ? "Generating…" : "✦ Generate with AI"}
                    </button>
                    <button
                      onClick={() => runAI("percentages")}
                      disabled={!!aiBusy || editingProject.checkpoints.filter(c => c.title.trim()).length === 0}
                      title="Splits 100% across your checkpoints"
                      className={css.linkXs}
                    >
                      {aiBusy === "percentages" ? "Generating…" : "✦ Percentages"}
                    </button>
                    <button onClick={() => setEditingProject({...editingProject, checkpoints: [...editingProject.checkpoints, { id: crypto.randomUUID(), title: "", percentage: 0, isCompleted: false, orderIndex: editingProject.checkpoints.length }]})} className={css.linkXs}>+ Add</button>
                  </div>
                </div>
                <div className="col">
                  {sorted(editingProject.checkpoints).map((cp) => (
                    <div key={cp.id} className="row">
                      <button onClick={() => { const cps = editingProject.checkpoints.map(c => c.id === cp.id ? {...c, isCompleted: !c.isCompleted} : c); setEditingProject({...editingProject, checkpoints: cps}); }} className={css.tickBox} data-on={cp.isCompleted} aria-label={cp.isCompleted ? "Mark incomplete" : "Mark complete"}>
                        {cp.isCompleted && <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" width={12} height={12} style={{ color: "currentColor" }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      </button>
                      <input type="text" value={cp.title} onChange={e => { const cps = [...editingProject.checkpoints]; const i = cps.findIndex(c => c.id === cp.id); cps[i] = {...cps[i], title: e.target.value}; setEditingProject({...editingProject, checkpoints: cps}); }} placeholder="Checkpoint title" className={`input input--sm grow ${cp.isCompleted ? css.done : ""}`}/>
                      <input type="number" value={cp.percentage} onChange={e => { const cps = [...editingProject.checkpoints]; const i = cps.findIndex(c => c.id === cp.id); cps[i] = {...cps[i], percentage: Number(e.target.value)}; setEditingProject({...editingProject, checkpoints: cps}); }} className={`input input--sm ${css.numField}`} min={0} max={100}/>
                      <span className={css.meta2Xs}>%</span>
                      <button onClick={() => setEditingProject({...editingProject, checkpoints: editingProject.checkpoints.filter(c => c.id !== cp.id)})} className={`${css.iconBtn} ${css.iconBtnDanger}`}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Links */}
              <div>
                <div className="row row--between">
                  <label className="label">Links</label>
                  <button onClick={() => setEditingProject({...editingProject, links: [...editingProject.links, { id: crypto.randomUUID(), type: "WEBSITE", url: "" }]})} className={css.linkXs}>+ Add</button>
                </div>
                <div className="col">
                  {editingProject.links.map((link) => (
                    <div key={link.id} className="row">
                      <select value={link.type} onChange={e => { const ls = editingProject.links.map(l => l.id === link.id ? {...l, type: e.target.value} : l); setEditingProject({...editingProject, links: ls}); }} className={`select select--sm ${css.typeField}`}>
                        <option value="GITHUB">GitHub</option>
                        <option value="WEBSITE">Website</option>
                        <option value="APP_STORE">App Store</option>
                        <option value="PLAY_STORE">Play Store</option>
                        <option value="FIGMA">Figma</option>
                        <option value="BEHANCE">Behance</option>
                        <option value="DRIBBBLE">Dribbble</option>
                        <option value="YOUTUBE">YouTube</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <input type="url" value={link.url} onChange={e => { const ls = editingProject.links.map(l => l.id === link.id ? {...l, url: e.target.value} : l); setEditingProject({...editingProject, links: ls}); }} placeholder="https://…" className="input input--sm grow"/>
                      <button onClick={() => setEditingProject({...editingProject, links: editingProject.links.filter(l => l.id !== link.id)})} className={`${css.iconBtn} ${css.iconBtnDanger}`}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Modal footer */}
            <div className={css.dialogFoot}>
              <HoldToDelete onConfirm={() => deleteProject(editingProject.id)} />
              <div className="row">
                <button onClick={() => setEditingProject(null)} className="btn btn--quiet">Cancel</button>
                <button
                  onClick={saveEditedProject}
                  disabled={editSaving}
                  className="btn btn--primary"
                >
                  {editSaving ? "Saving…" : editingProject.id.startsWith("new_") ? "Create Project" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ─── Top Nav ─────────────────────────────────────── */}
      <header className={css.topbar}>
        <div className="row">
          <Link href="/" className={css.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" aria-hidden="true" />
            <span className={css.strongMd}>Viefolio</span>
          </Link>
          <span className={css.crumbSep}>/</span>
          <span className={css.crumb}>Dashboard</span>
        </div>
        <div className="row">
          {profile.username && (
            <div className="row">
              <a href={`https://${profile.username}.viefolio.com`} target="_blank" rel="noopener noreferrer" className="btn btn--accent btn--sm">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                <span className={css.hideNarrow}>View live</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://${profile.username}.viefolio.com`).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }).catch(() => {});
                }}
                className="btn btn--outline btn--sm"
                title="Copy portfolio link"
              >
                {linkCopied ? (
                  <><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={14} height={14} style={{ color: "var(--success)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg><span className={`${css.hideNarrow} ${css.successText}`}>Copied!</span></>
                ) : (
                  <><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/></svg><span className={css.hideNarrow}>Copy link</span></>
                )}
              </button>
            </div>
          )}
          <span className={`${css.email} truncate`}>{user.email}</span>
          <button onClick={handleSignOut} className="btn btn--quiet btn--sm">Sign out</button>
          <button
            onClick={() => setShowAccountPanel(true)}
            className={css.avatarBtn}
            title="Account & Insights"
            aria-label="Account and insights"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className={css.avatarImg} />
            ) : (
              <div className={css.avatarLetter}>{displayName.charAt(0).toUpperCase()}</div>
            )}
          </button>
        </div>
      </header>

      {/* ─── Main ────────────────────────────────────────── */}
      <div className={css.main}>
        {/* ═══ LEFT COLUMN ═══════════════════════════════ */}
        <aside className={css.editor}>
          {/* Tab Switcher */}
          <div className={css.tabs}>
            <div className={css.tablist}>
              {VALID_TABS.map(tab => (
                <button key={tab} onClick={() => switchTab(tab)} aria-current={activeTab === tab ? "page" : undefined} className={css.tab}>
                  {activeTab === tab && (
                    <motion.span layoutId="tab-pill" className={css.tabPill} transition={{ type: "spring", duration: 0.3, bounce: 0 }} />
                  )}
                  <span className={css.tabLabel}>
                    {TAB_LABELS[tab]}
                  </span>
                </button>
              ))}
            </div>
            {/* Replaces the per-pane Save buttons — the only remaining signal
                that a write happened. aria-live so it isn't sighted-only. */}
            <p className={css.autosave} aria-live="polite">
              {profileSaving ? "Saving…" : profileSaved ? "All changes saved" : "Changes save automatically"}
            </p>
          </div>

          <div className={css.pane}>
          {/* ── PROFILE TAB ──────────────────────────────── */}
          {activeTab === "profile" && (
            <div className={css.paneScroll}>
              <div className={css.sectionHead}><div><h2 className={css.paneTitle}>Profile Settings</h2><p className={css.metaXs}>The name, photo and URL visitors see at the top of your portfolio.</p></div></div>
              <div className="row">
                {/* Avatar */}
                <div className={css.avatarEdit}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className={css.avatarEditImg}/>
                  ) : (
                    <div className={`${css.avatarEditImg} ${css.avatarLetter}`}>{displayName.charAt(0).toUpperCase()}</div>
                  )}
                  <label className={css.avatarOverlay}>
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={20} height={20} style={{ color: "currentColor" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/></svg>
                    <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}/>
                  </label>
                  <AnimatePresence>
                    {avatarUploading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={css.uploadBusy}>
                        <div className={`${css.ringSpinner} ${css.ringSpinnerSm}`}/>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div><p className={css.strongSm}>{displayName}</p><p className={css.metaXs}>{displayTitle}</p></div>
              </div>
              {/* Show Avatar Toggle */}
              <div className={css.toggleRow}>
                <div><p className={css.strongXs}>Show avatar on portfolio</p><p className={css.meta2Xs}>Display your profile picture publicly</p></div>
                <button onClick={() => setProfile(p => ({...p, showAvatar: !p.showAvatar}))} className="switch" data-on={profile.showAvatar} role="switch" aria-checked={!!profile.showAvatar} aria-label="Show avatar on portfolio">
                  <span className="switch__knob"/>
                </button>
              </div>
              <div className="col">
                {([
                  { key: "fullName", label: "Full Name", placeholder: "Your full name" },
                  { key: "title", label: "Professional Title", placeholder: "e.g. Software Engineer" },
                  { key: "location", label: "Location", placeholder: "e.g. San Francisco, CA" },
                ] as const).map(f => (
                  <div key={f.key}><label className="label">{f.label}</label><input type="text" value={profile[f.key]} onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} className="input"/></div>
                ))}
                <div><label className="label">Bio</label><textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Write a short bio about yourself…" rows={3} className="textarea"/></div>
                {/* Username / Claim URL */}
                <div>
                  <label className="label">Claim your URL</label>
                  <div className="input-group" data-state={usernameStatus}>
                    <input type="text" value={profile.username} onChange={e => { const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20); setProfile(p => ({...p, username: val})); checkUsername(val); }} placeholder="username" maxLength={20} className="input grow"/>
                    <span className="input-group__affix">.viefolio.com</span>
                    <AnimatePresence mode="wait">
                      {usernameStatus !== "idle" && (
                        <motion.span key={usernameStatus} initial={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }} className="row noshrink">
                          {usernameStatus === "checking" && <Spinner size={16} />}
                          {usernameStatus === "available" && <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--success)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                          {usernameStatus === "taken" && <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--danger)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {/* Status messages */}
                  <AnimatePresence mode="wait">
                    {usernameStatus === "available" && profile.username && (
                      <motion.div key="status-available" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", duration: 0.25, bounce: 0 }} className="note">
                        <p className={`${css.metaXs} ${css.successText}`}>✓ Username is available! Your portfolio: <span className="font-semibold">{profile.username}</span>.viefolio.com</p>
                      </motion.div>
                    )}
                    {usernameStatus === "taken" && (
                      <motion.div key="status-taken" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", duration: 0.25, bounce: 0 }} className="col">
                        <p className={`${css.metaXs} ${css.dangerText}`}>✗ Username is already taken.</p>
                        <div className="row row--wrap">
                          {usernameSuggestions.map(s => (
                            <button key={s} type="button" onClick={() => { setProfile(p => ({...p, username: s})); checkUsername(s); }} className="chip chip--sm">
                              {s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {usernameStatus === "idle" && profile.username && profile.username.length >= 2 && (
                      <motion.div key="status-idle" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", duration: 0.25, bounce: 0 }} className="note">
                        <p className={css.metaXs}>Your portfolio: <span className="font-semibold" style={{ color: "var(--ink)" }}>{profile.username}</span>.viefolio.com</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className={css.meta2Xs}>Lowercase letters, numbers, and dashes only. Max 20 characters.</p>
                </div>
              </div>
              {/* Header Layout */}
              <div>
                <label className="label">Header Layout</label>
                <div className="row">
                  {([{v:'LEFT' as const, l:'Left'},{v:'CENTER' as const, l:'Center'},{v:'RIGHT' as const, l:'Right'}]).map(o => (
                    <button key={o.v} onClick={() => setProfile(p => ({...p, userInfoLayout: o.v}))} className="chip chip--grow" data-active={profile.userInfoLayout === o.v}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LINKS TAB ──────────────────────────────────── */}
          {activeTab === "links" && (
            <div className={css.paneScroll}>
              <div className={css.sectionHead}>
                <div><h2 className={css.paneTitle}>Social Links</h2><p className={css.metaXs}>Point visitors to the places you already post.</p></div>
                <button onClick={() => { setProfile(p => ({...p, showLinks: !(p.showLinks ?? true)})); }} className="chip noshrink" data-active={profile.showLinks !== false}>
                  {profile.showLinks !== false ? 'Visible' : 'Hidden'}
                </button>
              </div>
              {/* Links Layout */}
              <div>
                <label className="label">Links Layout</label>
                <div className="row">
                  {([{v:'ICONS' as const, l:'Icons'},{v:'CARD' as const, l:'Cards'},{v:'CREATOR' as const, l:'Creator'}]).map(o => (
                    <button key={o.v} onClick={() => setProfile(p => ({...p, socialLinksLayout: o.v}))} className="chip chip--grow" data-active={profile.socialLinksLayout === o.v}>{o.l}</button>
                  ))}
                </div>
              </div>
              {/* Link entries */}
              <div className={css.listToolbar}>
                <span className={css.countLabel}>{profile.socialLinks.length} link{profile.socialLinks.length!==1?'s':''}</span>
                <button onClick={() => setProfile(p => ({...p, socialLinks: [...p.socialLinks, {id: crypto.randomUUID(), type: 'CUSTOM', title: '', url: '', visible: true}]}))} className="btn btn--primary btn--sm">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                  Add Link
                </button>
              </div>
              <div className="col">
                {profile.socialLinks.map((link, idx) => (
                  <div key={link.id} className={`${css.panelBox} col`}>
                    <div className="row">
                      <select value={link.type} onChange={e => setProfile(p => ({...p, socialLinks: p.socialLinks.map((l,i) => i===idx ? {...l, type: e.target.value as SocialLink['type']} : l)}))} className={`select select--sm ${css.typeField}`}>
                        <option value="GITHUB">GitHub</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="TWITTER">Twitter</option>
                        <option value="X">X</option>
                        <option value="YOUTUBE">YouTube</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="TIKTOK">TikTok</option>
                        <option value="FIGMA">Figma</option>
                        <option value="BEHANCE">Behance</option>
                        <option value="DRIBBBLE">Dribbble</option>
                        <option value="WEBSITE">Website</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                      <input type="text" value={link.title} onChange={e => setProfile(p => ({...p, socialLinks: p.socialLinks.map((l,i) => i===idx ? {...l, title: e.target.value} : l)}))} placeholder="Title" className="input input--sm grow"/>
                      <button onClick={() => setProfile(p => ({...p, socialLinks: p.socialLinks.map((l,i) => i===idx ? {...l, visible: !(l.visible ?? true)} : l)}))} className={css.iconBtn} title={link.visible !== false ? 'Visible' : 'Hidden'}>
                        <AnimatePresence mode="wait">
                        {link.visible !== false ? (
                          <motion.span key="vis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></motion.span>
                        ) : (
                          <motion.span key="hid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink-3)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg></motion.span>
                        )}
                      </AnimatePresence>
                      </button>
                      <button onClick={() => setProfile(p => ({...p, socialLinks: p.socialLinks.filter((_,i) => i!==idx)}))} className={`${css.iconBtn} ${css.iconBtnDanger}`}><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    <input type="url" value={link.url} onChange={e => setProfile(p => ({...p, socialLinks: p.socialLinks.map((l,i) => i===idx ? {...l, url: e.target.value} : l)}))} placeholder="https://..." className="input input--sm"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROJECTS TAB ──────────────────────────────── */}
          {activeTab === "projects" && (
            <div className={css.pane}>
              <div className={`${css.sectionHead} ${css.listHead}`}>
                <div><h2 className={css.paneTitle}>My Projects</h2><p className={css.metaXs}>Each project becomes a card on your portfolio. Add the work, then order it the way you want it read.</p></div>
                <button onClick={() => { setProfile(p => ({...p, showProjects: !(p.showProjects ?? true)})); }} className="chip noshrink" data-active={profile.showProjects !== false}>
                  {profile.showProjects !== false ? 'Visible' : 'Hidden'}
                </button>
              </div>
              <div className={`${css.listToolbar} ${css.listToolbarInset}`}>
                <span className={css.countLabel}>{projects.length} project{projects.length!==1?"s":""}</span>
                <div className="row noshrink">
                  <button onClick={() => setShowReorder(true)} className="btn btn--outline btn--sm">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
                    Reorder
                  </button>
                  <button onClick={createNewProject} className="btn btn--primary btn--sm">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    New Project
                  </button>
                </div>
              </div>
              <div className={css.list}>
                {projects.length===0 && (
                  <div className={css.empty}>
                    <div className={css.emptyIcon}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={28} height={28} style={{ color: "var(--ink-3)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg></div>
                    <p className={css.strongSm}>No projects yet</p>
                    <p className={css.metaXs}>Create your first project to get started</p>
                  </div>
                )}
                {projects.map(project => {
                  const isCompleted = project.status === "RELEASED";
                  return (
                    <div key={project.id} onClick={() => { setSelectedId(project.id); backupCheckpoints.current = project.checkpoints.map(c => ({...c})); setEditingProject({...project}); }} className={css.listItem} data-selected={selectedId === project.id} data-hidden={project.visible === false}>
                      {/* Image or avatar */}
                      {project.imageUrl && project.showImage ? (
                        <img src={project.imageUrl} alt={project.title} className={css.listThumb}/>
                      ) : (
                        <div className={css.listThumb} style={{ backgroundColor: '#f1f5f9' }}>
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20} style={{ color: "var(--ink-3)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
                        </div>
                      )}
                      {/* Title + description */}
                      <div className="grow">
                        <h3 className={`${css.listTitle} truncate`}>{project.title || 'Untitled'}</h3>
                        <p className={`${css.metaXs} truncate`}>{project.description || 'No description'}</p>
                      </div>
                      {/* Status + visibility */}
                      <div className="row noshrink">
                        <button onClick={e => { e.stopPropagation(); const updated = {...project, visible: !(project.visible ?? true)}; setProjects(ps => ps.map(p => p.id === project.id ? updated : p)); updateDoc(doc(db, 'projects', project.id), { visible: updated.visible }); }} className={css.iconBtn} title={project.visible !== false ? 'Visible' : 'Hidden'}>
                          <AnimatePresence initial={false} mode="popLayout">
                          {project.visible !== false ? (
                            <motion.span key="vis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></motion.span>
                          ) : (
                            <motion.span key="hid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink-3)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg></motion.span>
                          )}
                        </AnimatePresence>
                        </button>
                        <span className="tag" data-tone={isCompleted ? "accent" : undefined}>{isCompleted ? 'Done' : 'WIP'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Reorder Popup ── */}
              <AnimatePresence>
              {showReorder && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={css.scrim} onClick={() => setShowReorder(false)}>
                  <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} onClick={e => e.stopPropagation()} className={css.dialog}>
                    <div className={css.dialogHead}>
                      <h3 className={css.strongSm}>Reorder Projects</h3>
                      <button onClick={() => setShowReorder(false)} className={css.iconBtn}><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    <div className={css.dialogBody}>
                      {/* Completed */}
                      {(() => { const completed = projects.filter(p => p.status === 'RELEASED'); return completed.length > 0 ? (
                        <div>
                          <p className={css.sectionLabel}>Completed ({completed.length})</p>
                          <Reorder.Group axis="y" values={completed} onReorder={(reordered) => { const inProg = projects.filter(p => p.status !== 'RELEASED'); setProjects([...reordered, ...inProg].map((p,i)=>({...p,orderIndex:i}))); setProjectOrderChanged(true); }} className="col">
                            {completed.map((p, i) => (
                              <Reorder.Item key={p.id} value={p} className={css.reorderItem}>
                                <div className={css.reorderRow}>
                                  <MoveButtons index={i} count={completed.length} label={p.title || 'Untitled'} onMove={to => { const inProg = projects.filter(x => x.status !== 'RELEASED'); setProjects([...moveItem(completed, i, to), ...inProg].map((x, n) => ({ ...x, orderIndex: n }))); setProjectOrderChanged(true); }} />
                                  <span className="grow truncate">{p.title || 'Untitled'}</span>
                                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" width={14} height={14} style={{ color: "var(--success)" }} className="noshrink"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        </div>
                      ) : null; })()}
                      {/* In Progress */}
                      {(() => { const inProg = projects.filter(p => p.status !== 'RELEASED'); return inProg.length > 0 ? (
                        <div>
                          <p className={css.sectionLabel}>In Progress ({inProg.length})</p>
                          <Reorder.Group axis="y" values={inProg} onReorder={(reordered) => { const completed = projects.filter(p => p.status === 'RELEASED'); setProjects([...completed, ...reordered].map((p,i)=>({...p,orderIndex:i}))); setProjectOrderChanged(true); }} className="col">
                            {inProg.map((p, i) => (
                              <Reorder.Item key={p.id} value={p} className={css.reorderItem}>
                                <div className={css.reorderRow}>
                                  <MoveButtons index={i} count={inProg.length} label={p.title || 'Untitled'} onMove={to => { const done = projects.filter(x => x.status === 'RELEASED'); setProjects([...done, ...moveItem(inProg, i, to)].map((x, n) => ({ ...x, orderIndex: n }))); setProjectOrderChanged(true); }} />
                                  <span className="grow truncate">{p.title || 'Untitled'}</span>
                                  <span className={`${css.liveDot} noshrink`}/>
                                </div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        </div>
                      ) : null; })()}
                    </div>
                    <div className={css.dialogFoot}>
                      <AnimatePresence>
                        {projectOrderChanged && (
                          <motion.button
                            initial={{ opacity: 0, transform: "scale(0.97)" }}
                            animate={{ opacity: 1, transform: "scale(1)" }}
                            exit={{ opacity: 0, transform: "scale(0.97)" }}
                            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                            onClick={() => { saveProjectOrder(); setShowReorder(false); }}
                            className="btn btn--primary btn--sm grow"
                           
                          >
                            Save Order
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <button onClick={() => setShowReorder(false)} className="btn btn--outline btn--sm grow">Close</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
              </AnimatePresence>
              {/* Layout Style + Portfolio Visibility */}
              <div className={css.footerBar}>
                <div>
                  <label className="label">Layout Style</label>
                  <div className="row">
                    {LAYOUT_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setProfile(p => ({...p, layoutStyle: o.value}))} className="chip chip--grow chip--stack" data-active={profile.layoutStyle === o.value}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d={o.icon}/></svg>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Portfolio Visibility</label>
                  <div className="row">
                    {([{v:'ALL' as const, l:'All Projects'},{v:'RELEASED_ONLY' as const, l:'Released Only'}]).map(o => (
                      <button key={o.v} onClick={() => setProfile(p => ({...p, portfolioVisibility: o.v}))} className="chip chip--grow" data-active={profile.portfolioVisibility === o.v}>{o.l}</button>
                    ))}
                  </div>
                </div>
                
              </div>
            </div>
          )}

          {/* ═══ SKILLS TAB ═══════════════════════════════ */}
          {activeTab === "skills" && (
            <div className={css.paneScroll}>
              <div className={css.sectionHead}>
                <div><h2 className={css.paneTitle}>Your Skills</h2><p className={css.metaXs}>Name what you work with and set how far along you are. Each one shows as a labelled meter.</p></div>
                <button onClick={() => { setProfile(p => ({...p, showSkills: !(p.showSkills ?? true)})); }} className="chip noshrink" data-active={profile.showSkills !== false}>
                  {profile.showSkills !== false ? 'Visible' : 'Hidden'}
                </button>
              </div>
              <div className={css.listToolbar}>
                <span className={css.countLabel}>{profile.skills.length} skill{profile.skills.length!==1?'s':''}</span>
                <button onClick={() => setProfile(p => ({...p, skills: [...p.skills, { id: crypto.randomUUID(), name: "", level: 50, visible: true }]}))} className="btn btn--primary btn--sm">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={14} height={14}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                  Add Skill
                </button>
              </div>
              {profile.skills.length === 0 && <p className={`${css.metaXs} ${css.emptyNote}`}>No skills added yet. Add your first skill!</p>}
              <div className="col">
                <Reorder.Group axis="y" values={profile.skills} onReorder={(s) => setProfile(p => ({...p, skills: s}))} className="col">
                  {profile.skills.map((skill: Skill, si: number) => (
                    <Reorder.Item key={skill.id} value={skill} className={css.reorderItem}>
                      <div className={css.panelBox} data-dim={skill.visible === false}>
                        <div className="row">
                      <MoveButtons index={si} count={profile.skills.length} label={skill.name || 'skill'} onMove={to => setProfile(p => ({ ...p, skills: moveItem(p.skills, si, to) }))} />
                      <input type="text" value={skill.name} onChange={e => setProfile(p => ({...p, skills: p.skills.map(s => s.id === skill.id ? {...s, name: e.target.value} : s)}))} placeholder="Skill name (e.g. React)" className="input input--sm grow"/>
                      <button onClick={() => setProfile(p => ({...p, skills: p.skills.map(s => s.id === skill.id ? {...s, visible: !(s.visible ?? true)} : s)}))} className={css.iconBtn} title={skill.visible !== false ? 'Visible' : 'Hidden'}>
                        <AnimatePresence initial={false} mode="popLayout">
                        {skill.visible !== false ? (
                          <motion.span key="vis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></motion.span>
                        ) : (
                          <motion.span key="hid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className={css.iconFlex}><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} style={{ color: "var(--ink-3)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg></motion.span>
                        )}
                      </AnimatePresence>
                      </button>
                      <button onClick={() => setProfile(p => ({...p, skills: p.skills.filter(s => s.id !== skill.id)}))} className={`${css.iconBtn} ${css.iconBtnDanger}`}><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    <div className="row">
                      <input type="range" min={1} max={100} value={skill.level} onChange={e => setProfile(p => ({...p, skills: p.skills.map(s => s.id === skill.id ? {...s, level: Number(e.target.value)} : s)}))} className="range grow"/>
                      <span className={`${css.metaXs} ${css.meterValue}`}>{skill.level}%</span>
                    </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>
          )}

          {/* ═══ APPEARANCE TAB ═══════════════════════════ */}
          {activeTab === "appearance" && (
            <div className={css.paneScroll}>
              <div className={css.sectionHead}><div><h2 className={css.paneTitle}>Appearance</h2><p className={css.metaXs}>Start from a style, then tune the colours, type and shapes until it feels like yours.</p></div></div>

              {/* ── Current Style ── */}
              <div>
                <label className="label">Current Style</label>
                {(() => {
                  const presetMeta: Record<string, {l:string;d:string;bg:string;fg:string}> = {
                    MINIMAL:{l:'Minimal',d:'Clean & light',bg:'#fdfbf3',fg:'#013e37'},
                    NEON:{l:'Neon',d:'Dark & glowing',bg:'#0a0a0a',fg:'#22d3ee'},
                    GLASSMORPHISM:{l:'Glass',d:'Frosted & airy',bg:'#012b26',fg:'#ffefb3'},
                    BRUTALIST:{l:'Brutalist',d:'Bold & raw',bg:'#ffefb3',fg:'#000000'},
                    MONOCHROME:{l:'Monochrome',d:'Pure grayscale',bg:'#f8f8f8',fg:'#374151'},
                  };
                  const m = presetMeta[profile.theme.preset] ?? presetMeta.MINIMAL;
                  return (
                    <div className={`row ${css.selectedBox}`}>
                      <div className={css.thumbBox} style={{backgroundColor:m.bg}}>
                        <span className={css.strongMd} style={{color:m.fg}}>Aa</span>
                      </div>
                      <div className="grow">
                        <p className={css.strongSm}>{m.l}</p>
                        <p className={css.metaXs}>{m.d}</p>
                      </div>
                      <button onClick={() => setShowThemeModal(true)} className="btn btn--outline btn--sm noshrink">
                        Change Style
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* ── Theme Preset Modal ── */}
              <AnimatePresence>
              {showThemeModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={css.scrim}
                  onClick={() => setShowThemeModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    className={`${css.dialog} ${css.dialogNarrow}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className={css.dialogHead}>
                      <h3 className={css.strongSm}>Choose a Style</h3>
                      <button onClick={() => setShowThemeModal(false)} className={css.iconBtn}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <div className={`grid-2 ${css.presetPad}`}>
                      {([
                        {p:'MINIMAL' as ThemePreset,l:'Minimal',d:'Clean & light',bg:'#fdfbf3',fg:'#013e37'},
                        {p:'NEON' as ThemePreset,l:'Neon',d:'Dark & electric',bg:'#0a0a0a',fg:'#22d3ee'},
                        {p:'GLASSMORPHISM' as ThemePreset,l:'Glass',d:'Frosted & airy',bg:'#012b26',fg:'#ffefb3'},
                        {p:'BRUTALIST' as ThemePreset,l:'Brutalist',d:'Bold & raw',bg:'#ffefb3',fg:'#000000'},
                        {p:'MONOCHROME' as ThemePreset,l:'Monochrome',d:'Pure grayscale',bg:'#f8f8f8',fg:'#374151'},
                      ]).map(o => (
                        <button key={o.p} onClick={() => {
                          // A style is the whole look — take every field, not
                          // just the colors, or "Brutalist" arrives in a sans
                          // font with rounded buttons.
                          setProfile(pr => ({...pr, theme: { preset: o.p, ...THEME_PRESETS[o.p] }}));
                          setShowThemeModal(false);
                        }} className={css.preset} data-active={profile.theme.preset===o.p}>
                          <div className={css.presetPreview} style={{backgroundColor:o.bg}}>
                            <span className={css.strongSm} style={{color:o.fg}}>Aa</span>
                          </div>
                          <p className={css.strongXs}>{o.l}</p>
                          <p className={css.meta2Xs}>{o.d}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* ── Custom Colors ── */}
              <div>
                <h3 className={css.sectionLabel}>Custom Colors</h3>
                <div className="col">
                  {([
                    {k:'background' as const, l:'Background'},
                    {k:'card' as const, l:'Cards'},
                    {k:'accent' as const, l:'Accent'},
                    {k:'text' as const, l:'Text'},
                    {k:'descriptionColor' as const, l:'Description'},
                  ]).map(c => (
                    <div key={c.k} className="row">
                      <label className={`${css.metaXs} ${css.meterName}`}>{c.l}</label>
                      <div className={css.thumbBox}>
                        <input
                          type="color"
                          value={profile.theme.colors[c.k].startsWith('rgba') ? '#808080' : profile.theme.colors[c.k]}
                          onChange={e => setProfile(p => ({...p, theme: {...p.theme, colors: {...p.theme.colors, [c.k]: e.target.value}}}))}
                          className={css.colorSwatch}
                        />
                      </div>
                      <input
                        type="text"
                        value={profile.theme.colors[c.k]}
                        onChange={e => setProfile(p => ({...p, theme: {...p.theme, colors: {...p.theme.colors, [c.k]: e.target.value}}}))}
                        className="input input--sm grow mono"
                        placeholder="#ffffff"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Font Family ── */}
              <div>
                <label className="label">Font Family</label>
                <div className="grid-2">
                  {([
                    {v:'SANS' as ThemeFont, l:'Sans', sample:'Clean Aa'},
                    {v:'SERIF' as ThemeFont, l:'Serif', sample:'Elegant Aa'},
                    {v:'MONO' as ThemeFont, l:'Mono', sample:'0x1a Aa'},
                    {v:'DISPLAY' as ThemeFont, l:'Display', sample:'Grand Aa'},
                  ]).map(f => (
                    <button key={f.v} onClick={() => setProfile(p => ({...p, theme: {...p.theme, fontFamily: f.v}}))}
                      className={css.preset} data-active={(profile.theme.fontFamily ?? 'SANS') === f.v}>
                      <p className={css.strongSm} style={f.v === 'SERIF' ? {fontFamily:"Georgia,serif"} : f.v === 'MONO' ? {fontFamily:"monospace"} : f.v === 'DISPLAY' ? {fontFamily:"'Palatino Linotype',Palatino,serif"} : {}}>{f.sample}</p>
                      <p className={css.meta2Xs}>{f.l}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Card Style ── */}
              <div>
                <label className="label">Card Style</label>
                <div className="grid-2">
                  {([
                    {v:'FLAT' as CardStyle, l:'Flat', d:'Minimal border'},
                    {v:'SOFT_SHADOW' as CardStyle, l:'Soft Shadow', d:'Subtle depth'},
                    {v:'GLASSMORPHIC' as CardStyle, l:'Glassmorphic', d:'Frosted blur'},
                    {v:'BRUTALIST' as CardStyle, l:'Brutalist', d:'Bold offset'},
                  ]).map(cs => (
                    <button key={cs.v} onClick={() => setProfile(p => ({...p, theme: {...p.theme, cardStyle: cs.v}}))}
                      className={css.preset} data-active={(profile.theme.cardStyle ?? 'FLAT') === cs.v}>
                      <p className={css.strongXs}>{cs.l}</p>
                      <p className={css.meta2Xs}>{cs.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Button Style ── */}
              <div>
                <label className="label">Link Button Style</label>
                <div className="row">
                  {([
                    {v:'PILL' as ButtonStyle, l:'Pill'},
                    {v:'ROUNDED' as ButtonStyle, l:'Rounded'},
                    {v:'SHARP' as ButtonStyle, l:'Sharp'},
                    {v:'GHOST' as ButtonStyle, l:'Ghost'},
                  ]).map(bs => (
                    <button key={bs.v} onClick={() => setProfile(p => ({...p, theme: {...p.theme, buttonStyle: bs.v}}))}
                      className="chip chip--grow" data-active={(profile.theme.buttonStyle ?? 'ROUNDED') === bs.v}>
                      {bs.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Texture Overlay ── */}
              <div>
                <label className="label">Texture Overlay</label>
                <div className="row">
                  {(['NONE','DOTS','GRID','NOISE'] as ThemeTexture[]).map(t => (
                    <button key={t} onClick={() => setProfile(p => ({...p, theme: {...p.theme, texture: t}}))}
                      className="chip chip--grow" data-active={profile.theme.texture===t}>
                      {t.charAt(0)+t.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className={css.toggleRow}>
                  <div>
                    <p>List in the Explore directory</p>
                    <p>Show your portfolio on viefolio.com/explore. Off by default, reversible any time.</p>
                  </div>
                  <button
                    onClick={() => setProfile(p => ({...p, listedInDirectory: !p.listedInDirectory}))}
                    className="switch"
                    data-on={!!profile.listedInDirectory}
                    role="switch"
                    aria-checked={!!profile.listedInDirectory}
                    aria-label="List in the Explore directory"
                  >
                    <span className="switch__knob" />
                  </button>
                </div>

            </div>
          )}
          </div>
        </aside>

        {/* ═══ RIGHT COLUMN — LIVE PREVIEW ═══════════════ */}
        <main className={css.preview}>
          <div className={css.previewInner}>
            <div className="row row--between">
              <div className="row"><span className={css.liveDot}/><span className={css.metaXs}>Live Preview</span></div>
              {profile.username ? (
                <a href={`https://${profile.username}.viefolio.com`} target="_blank" rel="noopener noreferrer" className={`${css.linkXs} mono`}>{profile.username}.viefolio.com ↗</a>
              ) : (
                <span className={`${css.metaXs} mono`}>{user.email?.split("@")[0] || "user"}.viefolio.com</span>
              )}
            </div>
            <div className={css.previewFrame}>
              {/* Browser chrome dots */}
              <div className={css.previewBar}>
                <div className="row"><span className={css.dot}/><span className={css.dot}/><span className={css.dot}/></div>
                <div className="grow row"><div className={css.urlChip}><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={10} height={10}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>{profile.username || user.email?.split("@")[0] || "user"}.viefolio.com</div></div>
              </div>
              {/* Preview content */}
              <div style={{backgroundColor: profile.theme.colors.background}} className="overflow-y-auto max-h-[600px]">
                <nav className={css.previewBar} style={{backgroundColor: `${profile.theme.colors.background}cc`, borderColor: profile.theme.preset === 'NEON' || profile.theme.preset === 'GLASSMORPHISM' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}}>
                  <div className="row">
                    <img src="/logo.svg" alt="" aria-hidden="true" className={css.swatchChip} />
                    <span className={css.strongSm} style={{color: profile.theme.colors.text}}>{profile.fullName || profile.username || "Preview"}</span>
                  </div>
                </nav>
                <div className={css.previewInner}>
                  <PortfolioView 
                    profile={profile} 
                    projects={profile.portfolioVisibility === "RELEASED_ONLY" ? projects.filter(p => p.status === "RELEASED" || p.status === "COMPLETED") : projects} 
                    skills={profile.skills} 
                  />
                </div>
                <footer className={css.divideTop} style={{borderColor: profile.theme.preset === 'NEON' || profile.theme.preset === 'GLASSMORPHISM' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}}>
                  <div className={css.dialogFoot}>
                    <span className={css.metaXs}>Powered by <span className="font-semibold" style={{ color: profile.theme.colors.accent }}>Viefolio</span></span>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* ─── Mobile Preview ──────────────────────────────── */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className={`btn btn--primary ${css.mobilePreviewBtn}`}
       
        aria-label="Preview your portfolio"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Preview
      </button>
      <AnimatePresence>
        {showMobilePreview && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className={css.mobileSheet}
          >
            <div className={css.mobileSheetHead}>
              <div className="row">
                <span className={css.liveDot}/>
                <span className={css.metaXs}>Live Preview</span>
              </div>
              <button onClick={() => setShowMobilePreview(false)} className={css.iconBtn} aria-label="Close preview">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className={css.mobileSheetBody} style={{ backgroundColor: profile.theme.colors.background }}>
              <div className={css.mobileSheetBody}>
                <PortfolioView
                  profile={profile}
                  projects={profile.portfolioVisibility === "RELEASED_ONLY" ? projects.filter(p => p.status === "RELEASED" || p.status === "COMPLETED") : projects}
                  skills={profile.skills}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Onboarding Modal */}
      <AnimatePresence>{showOnboarding && user && <OnboardingModal userId={user.uid} onComplete={() => setShowOnboarding(false)} />}</AnimatePresence>
    </div>
    </MotionConfig>
  );
}

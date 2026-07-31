/* Server component — animations are pure CSS (see globals.css) so the
   landing page ships no framer-motion or page-level JavaScript. */
import Link from "next/link";
import Features from "./components/Features";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ─── Navbar ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-[#f1f5f9]">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Viefolio" className="logo-mark w-20 h-20" />
            <span className="text-2xl font-semibold text-[#0f172a] tracking-tight">Viefolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:inline-flex px-4 py-2 text-m font-medium text-[#475569] hover:text-[#0f172a] transition-colors rounded-lg">
              Log In
            </a>
            <a
              href="/login"
              className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-m font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────── */}
      <section className="hero-glow relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 md:pt-40 md:pb-32 text-center">
          {/* Persona badge */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#eef2ff] border border-[#e0e7ff] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
              <span className="text-xs font-semibold text-[#6366f1] tracking-wide">
                For Developers · Designers · Creators · Students
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0f172a] leading-[1.08] mb-6 max-w-4xl mx-auto">
            Your work deserves{" "}
            <span className="text-[#6366f1]">a beautiful home</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up delay-200 text-base sm:text-lg md:text-xl text-[#64748b] max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether you ship code, design interfaces, create content, or study — Viefolio builds a stunning portfolio that grows with you. Six distinct themes, multi-persona layouts, live from day one.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Build Your Portfolio Free
            </a>
            <a
              href="https://apps.apple.com/tr/app/viefolio/id6792746265"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-[#0f172a] bg-white border border-[#e2e8f0] hover:border-[#c7d2fe] hover:bg-[#fafafe]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download for iOS
            </a>
          </div>

          {/* Hero visual mockup */}
          <div className="animate-fade-in-up delay-400 mt-16 md:mt-20 max-w-4xl mx-auto">
            <div className="relative rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl shadow-indigo-100/40 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f1f5f9] bg-[#fafbfc]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#fca5a5]" />
                  <span className="w-3 h-3 rounded-full bg-[#fcd34d]" />
                  <span className="w-3 h-3 rounded-full bg-[#86efac]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1.5 px-4 py-1 rounded-md bg-[#f1f5f9] text-xs text-[#94a3b8] font-mono">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    yourname.viefolio.com
                  </div>
                </div>
              </div>

              {/* Mockup — 3 persona cards */}
              <div className="p-8 md:p-12 bg-gradient-to-br from-white to-[#f8fafc]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Developer card */}
                  <div className="animate-float rounded-xl border border-[#e2e8f0] bg-white p-5" style={{ animationDuration: "3.2s" }}>
                    <div className="h-24 rounded-lg bg-gradient-to-br from-[#eef2ff] to-[#e0e7ff] mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#6366f1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                    </div>
                    <div className="h-3 w-3/4 bg-[#e2e8f0] rounded mb-2" />
                    <div className="h-2 w-full bg-[#f1f5f9] rounded mb-3" />
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#eef2ff] text-[8px] font-semibold text-[#6366f1]">React</span>
                      <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[8px] font-semibold text-[#d97706]">Firebase</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#6366f1] rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>

                  {/* Designer card */}
                  <div className="animate-float rounded-xl border border-[#e2e8f0] bg-white p-5" style={{ animationDuration: "3.2s", animationDelay: "0.6s" }}>
                    <div className="h-24 rounded-lg bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3] mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#ec4899]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                      </svg>
                    </div>
                    <div className="h-3 w-2/3 bg-[#e2e8f0] rounded mb-2" />
                    <div className="h-2 w-full bg-[#f1f5f9] rounded mb-3" />
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#fdf4ff] text-[8px] font-semibold text-[#a855f7]">Figma</span>
                      <span className="px-2 py-0.5 rounded bg-[#eff6ff] text-[8px] font-semibold text-[#2563eb]">Framer</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: "55%", background: "linear-gradient(90deg, #ec4899, #f472b6)" }} />
                    </div>
                  </div>

                  {/* Creator card */}
                  <div className="animate-float rounded-xl border border-[#e2e8f0] bg-white p-5" style={{ animationDuration: "3.2s", animationDelay: "1.2s" }}>
                    <div className="h-24 rounded-lg bg-gradient-to-br from-[#fff7ed] to-[#fed7aa] mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#ea580c]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="h-3 w-1/2 bg-[#e2e8f0] rounded mb-2" />
                    <div className="h-2 w-full bg-[#f1f5f9] rounded mb-3" />
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#fff7ed] text-[8px] font-semibold text-[#ea580c]">YouTube</span>
                      <span className="px-2 py-0.5 rounded bg-[#faf5ff] text-[8px] font-semibold text-[#9333ea]">TikTok</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: "88%", background: "linear-gradient(90deg, #f97316, #fb923c)" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Technical Features ────────────────────────── */}
      <Features />

      {/* ─── Features Grid ───────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef2ff] border border-[#e0e7ff] mb-5">
              <span className="text-xs font-semibold text-[#6366f1]">Built for Everyone</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0f172a] tracking-tight mb-4">
              Every creative deserves to{" "}
              <span className="text-[#6366f1]">stand out</span>
            </h2>
            <p className="text-base md:text-lg text-[#64748b] max-w-xl mx-auto">
              A complete toolkit for developers, designers, creators, and students to showcase work, track progress, and impress anyone.
            </p>
          </div>

          <div className="space-y-5">
            {/* Feature 1 — Modular Theme Engine */}
            <div className="feature-card rounded-2xl border border-[#f1f5f9] bg-white p-7 md:p-9 flex flex-col md:flex-row md:items-center md:gap-10">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#eef2ff] flex items-center justify-center mb-5 md:mb-0">
                <svg className="w-6 h-6 text-[#6366f1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f0fdf4] text-[10px] font-semibold text-[#16a34a] mb-2">New</span>
                <h3 className="text-lg font-semibold text-[#0f172a] mb-2">Modular Theme Engine</h3>
                <p className="text-sm text-[#64748b] leading-relaxed max-w-[55ch]">
                  Choose from 6 distinct presets — Minimal, Neon, Glass, Brutalist, Soft, Monochrome — then fine-tune font family, card style, button shape, and colors down to the hex code.
                </p>
              </div>
              <div className="hidden md:flex flex-shrink-0 flex-col gap-2 pt-1">
                {[{l:'Minimal',bg:'#fff',fg:'#0f172a'},{l:'Neon',bg:'#0a0a0a',fg:'#22d3ee'},{l:'Glass',bg:'#0f172a',fg:'#a78bfa'},{l:'Soft',bg:'#f9f5ff',fg:'#8b5cf6'}].map(t => (
                  <div key={t.l} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e2e8f0]" style={{backgroundColor:t.bg}}>
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor:t.fg}}/>
                    <span className="text-[10px] font-semibold" style={{color:t.fg}}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features 2-4 — 3-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Multi-Persona Layouts */}
              <div className="feature-card rounded-2xl border border-[#f1f5f9] bg-white p-6">
                <div className="w-11 h-11 rounded-xl bg-[#fdf2f8] flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#ec4899]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-[#0f172a] mb-2">Multi-Persona Layouts</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">
                  Portfolio layouts made for your craft. Developer timelines, designer grids, creator link pages, student CVs — all from one dashboard.
                </p>
              </div>

              {/* Live Progress Tracking */}
              <div className="feature-card rounded-2xl border border-[#f1f5f9] bg-white p-6">
                <div className="w-11 h-11 rounded-xl bg-[#f0fdf4] flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-[#0f172a] mb-2">Live Progress Tracking</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">
                  Showcase your process, not just the result. Set milestones, track checkpoints, and let visitors see your journey in real time.
                </p>
              </div>

              {/* Mobile + Web Sync */}
              <div className="feature-card rounded-2xl border border-[#f1f5f9] bg-white p-6">
                <div className="w-11 h-11 rounded-xl bg-[#fffbeb] flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-[#0f172a] mb-2">Web + iOS, Always in Sync</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">
                  Update from your iPhone, see it live on the web instantly. One portfolio, two surfaces, zero friction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Who It's For ────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              One platform, every creative path
            </h2>
            <p className="text-base text-[#64748b] max-w-lg mx-auto">
              Whatever your craft, Viefolio has a layout and a theme built for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
                label: "Developers",
                desc: "Timelines, GitHub links, tech stack badges, progress bars.",
                color: "#6366f1",
                bg: "#eef2ff",
              },
              {
                icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
                label: "Designers",
                desc: "Carousel galleries, Figma links, Dribbble & Behance profiles.",
                color: "#ec4899",
                bg: "#fdf2f8",
              },
              {
                icon: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
                label: "Creators",
                desc: "Link-in-bio layouts, YouTube, TikTok, Instagram integrations.",
                color: "#f59e0b",
                bg: "#fffbeb",
              },
              {
                icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
                label: "Students",
                desc: "Academic projects, internships, coursework — all in one place.",
                color: "#22c55e",
                bg: "#f0fdf4",
              },
            ].map(p => (
              <div key={p.label} className="feature-card bg-white rounded-2xl border border-[#f1f5f9] p-6 text-center">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: p.bg }}>
                  <svg className="w-5 h-5" style={{ color: p.color }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[#0f172a] mb-1.5">{p.label}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-base text-[#64748b] max-w-lg mx-auto">
              Three simple steps to a portfolio that grows with your career.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n: "1", h: "Add Your Work", b: "Enter projects, tools, links, and skills — whether you code, design, film, or study." },
              { n: "2", h: "Choose Your Theme", b: "Pick from 6 curated styles, then make it yours with custom colors, fonts, and card shapes." },
              { n: "3", h: "Go Live Instantly", b: "Share your yourname.viefolio.com link everywhere. No deployment, no config." },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-11 h-11 rounded-xl bg-[#eef2ff] flex items-center justify-center mx-auto mb-5">
                  <span className="text-sm font-bold text-[#6366f1]">{s.n}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0f172a] mb-2">{s.h}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─────────────────────────────────── */}
      <section className="py-28 md:py-36 bg-[#fafbff]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
            Ready to stand out?
          </h2>
          <p className="text-base text-[#64748b] mb-10 max-w-[52ch] mx-auto leading-relaxed">
            Join thousands of developers, designers, creators, and students who showcase their best work with Viefolio. It&apos;s free to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Create Your Portfolio — Free
            </a>
            <a
              href="https://apps.apple.com/tr/app/viefolio/id6792746265"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-[#0f172a] bg-white border border-[#e2e8f0] hover:border-[#c7d2fe] hover:bg-[#fafafe]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download for iOS
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[#f1f5f9] py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Viefolio" className="w-6 h-6" />
            <span className="text-sm text-[#94a3b8]">© {new Date().getFullYear()} Viefolio. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#94a3b8]">
            <a href="/privacy" className="hover:text-[#64748b] transition-colors">Privacy</a>
            <a href="mailto:support@viefolio.com" className="hover:text-[#64748b] transition-colors">Contact</a>
            <a href="/terms" className="hover:text-[#64748b] transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

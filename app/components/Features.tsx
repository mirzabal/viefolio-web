import Reveal from "@/components/Reveal";
import { Icon } from "@/lib/icons";
import s from "./Features.module.css";

const PROGRESS = [
  { label: "UI design", value: 85 },
  { label: "Core logic", value: 60 },
  { label: "Testing", value: 30 },
];

export default function Features() {
  return (
    /* The one dark stretch on the page. Butter on deep green is the palette
       at full strength, and it breaks the cream from running end to end. */
    <section className={`${s.section} on-ink`}>
      <div className="wrap">
        <Reveal className={s.head}>
          <span className="eyebrow" style={{ color: "var(--on-ink-2)" }}>
            Under the hood
          </span>
          <h2>
            A living portfolio, not a static page
          </h2>
          <p className="lede">
            Real-time sync underneath, considered design on the surface. It updates the moment
            you do.
          </p>
        </Reveal>

        <div className={s.grid}>
          <Reveal className={s.card}>
            <div className={s.icon}>
              <Icon name="palette" size={22} />
            </div>
            <h3>A portfolio worth sharing</h3>
            <p>
              One goal: give your work a home that looks like you hired a designer. Pick a theme,
              add your projects, get a polished site at your own address. No page builders, no
              fighting with templates.
            </p>
            <div className={s.pills}>
              {["Design-first", "No code", "Live in minutes"].map(l => (
                <span key={l} className={s.pill}>
                  <i className={s.pillDot} aria-hidden="true" />
                  {l}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={60} className={s.card}>
            <div className={s.icon}>
              <Icon name="chart" size={22} />
            </div>
            <h3>Checkpoints, not just outcomes</h3>
            <p>
              Show the <em>process</em>. Weight each stage, tick milestones as you finish them,
              and let a visitor see exactly where a project stands today.
            </p>
            <div className={s.meter}>
              {PROGRESS.map(p => (
                <div key={p.label}>
                  <div className={s.meterRow}>
                    <span>{p.label}</span>
                    <span>{p.value}%</span>
                  </div>
                  <span className="progress" style={{ "--track": "rgb(255 239 179 / 0.14)", "--progress-h": "5px" } as React.CSSProperties}>
                    <span className="progress__fill" style={{ width: `${p.value}%`, background: "var(--butter)" }} />
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className={s.card}>
            <div className={s.icon}>
              <Icon name="monitor" size={22} />
            </div>
            <h3>Edit here, live there</h3>
            <p>
              Type in the dashboard and watch the generated site change beside you. Your{" "}
              <code className={s.code}>username.viefolio.com</code> is never out of date.
            </p>
            <div className={s.preview}>
              <div className={s.previewBar}>
                <i aria-hidden="true" />
                <i aria-hidden="true" />
                <i aria-hidden="true" />
                <span className={s.previewUrl}>alex.viefolio.com</span>
              </div>
              <div className={s.previewBody}>
                <span className={s.line} style={{ inlineSize: "60%" }} />
                <span className={s.line} style={{ inlineSize: "100%", blockSize: "0.35rem" }} />
                <span className={s.line} style={{ inlineSize: "80%", blockSize: "0.35rem" }} />
                <div className={s.thumbs}>
                  <div />
                  <div />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

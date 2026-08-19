import pv from "./portfolio.module.css";
import s from "./loading.module.css";

/* Skeleton shown while the portfolio's Firestore data loads. */
export default function PortfolioLoading() {
  return (
    <div className={pv.page}>
      <div className={s.bar}>
        <div className={pv.barInner}>
          <div className="row">
            <span className={`skeleton ${s.mark}`} />
            <span className={`skeleton ${s.name}`} />
          </div>
          <span className={`skeleton ${s.credit}`} />
        </div>
      </div>

      <div className={s.body}>
        <div className={s.identity}>
          <span className={`skeleton ${s.avatar}`} />
          <div className={s.identityText}>
            <span className={`skeleton ${s.lineLg}`} />
            <span className={`skeleton ${s.lineMd}`} />
            <span className={`skeleton ${s.lineSm}`} />
          </div>
        </div>

        <div className={s.pills}>
          {[0, 1, 2].map(i => <span key={i} className={`skeleton ${s.pill}`} />)}
        </div>

        <div className={s.grid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={s.card}>
              <span className={`skeleton ${s.thumb}`} />
              <span className={`skeleton ${s.lineMd}`} />
              <span className={`skeleton ${s.lineSm}`} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading portfolio…</span>
    </div>
  );
}

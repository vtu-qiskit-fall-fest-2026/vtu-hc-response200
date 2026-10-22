import { useState } from "react";
import { useApp } from "@/lib/data";
import { pct, priorityLabel } from "@/format";

const BAR = ["bg-carbon", "bg-emerald-300", "bg-amber-300", "bg-amber-500", "bg-rose-500"];

/** Feature 6: is the chosen plan fragile when the carbon forecast is wrong? */
export function Robustness() {
  const { data } = useApp();
  const rb = data.robustness;
  const [err, setErr] = useState(5);
  if (!rb) return null;
  const studies = rb.studies.filter((s) => s.error_pct === err);
  return (
    <section id="robustness" className="scroll-mt-24 px-4 pb-24">
      <div className="mx-auto max-w-[1150px] rounded-3xl bg-white p-6 ring-1 ring-border">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">Is the plan fragile?</h2>
            <p className="mt-1 max-w-[620px] text-[14px] text-muted-foreground">
              Carbon forecasts are never exact. We fix the plan from the forecast, then let reality differ by up to ±{err}% in each slot&rsquo;s grid carbon, {studies[0]?.draws ?? 200} times, and compare with the best plan for what actually happened.
            </p>
          </div>
          <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Forecast error">
            {[5, 10].map((e) => (
              <button key={e} role="tab" aria-selected={err === e} onClick={() => setErr(e)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${err === e ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                ±{e}% error
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {studies.map((s) => (
            <div key={s.w} className="rounded-2xl bg-muted/60 p-4">
              <p className="text-[13px] font-semibold">{priorityLabel(s.w)}</p>
              <p className="mt-2 text-[32px] leading-none font-semibold tracking-tight tabular-nums">{pct(s.within_5pct)}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">of forecasts: within 5% of the new best · still exactly best in {pct(s.still_best)} · worst case {s.worst_regret_pct.toFixed(1)}% worse</p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full" role="img"
                aria-label={s.histogram.map((h) => `${h.label}: ${pct(h.share)}`).join(", ")}>
                {s.histogram.map((h, i) => (h.share > 0 ? <span key={h.label} className={BAR[i]} style={{ width: `${h.share * 100}%` }} title={`${h.label}: ${pct(h.share)}`} /> : null))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          {(studies[0]?.histogram ?? []).map((h, i) => (
            <span key={h.label} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${BAR[i]}`} aria-hidden="true" />{h.label}</span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">{rb.note} Brute-force check, no hardware.</p>
      </div>
    </section>
  );
}

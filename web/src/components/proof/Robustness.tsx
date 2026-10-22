import { useState } from "react";
import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { pct, prefersReducedMotion, priorityLabel } from "@/format";
import { Info, Segmented } from "@/components/slides/ui";

const BAR = ["bg-carbon", "bg-emerald-300", "bg-amber-300", "bg-amber-500", "bg-rose-500"];

/** Feature 6: is the chosen plan fragile when the carbon forecast is wrong? */
export function ForecastPanel() {
  const { data } = useApp();
  const rb = data.robustness;
  const [err, setErr] = useState(5);
  if (!rb) return null;
  const studies = rb.studies.filter((s) => s.error_pct === err);
  const reduced = prefersReducedMotion();
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1 text-[16px] font-semibold">
          Plan fixed from the forecast, then reality differs.
          <Info>{studies[0]?.draws ?? 200} random draws of ±{err}% error in each slot&rsquo;s grid carbon, compared with the best plan for what actually happened. Brute force, no hardware.</Info>
        </p>
        <Segmented label="Forecast error" value={err} onChange={setErr} options={[5, 10].map((e) => ({ value: e, label: `±${e}% error` }))} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
        {studies.map((s) => (
          <div key={s.w} className="flex flex-col rounded-2xl bg-muted/50 p-5">
            <p className="text-[15px] font-semibold">{priorityLabel(s.w)}</p>
            <p className="mt-4 text-[56px] leading-none font-semibold tracking-tight tabular-nums">{pct(s.within_5pct)}</p>
            <p className="mt-2 text-[14px] text-muted-foreground">of draws within 5% of the new best</p>
            <div className="mt-auto pt-5">
              <div className="flex h-4 overflow-hidden rounded-full bg-white" role="img" aria-label={s.histogram.map((h) => `${h.label}: ${pct(h.share)}`).join(", ")}>
                {s.histogram.map((h, i) => (h.share > 0 ? (
                  <motion.span key={h.label} className={BAR[i]} title={`${h.label}: ${pct(h.share)}`}
                    initial={{ width: reduced ? `${h.share * 100}%` : 0 }} animate={{ width: `${h.share * 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }} />
                ) : null))}
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">exactly best {pct(s.still_best)} · worst {s.worst_regret_pct.toFixed(1)}% worse</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {(studies[0]?.histogram ?? []).map((h, i) => (
          <span key={h.label} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${BAR[i]}`} aria-hidden="true" />{h.label}</span>
        ))}
      </div>
    </div>
  );
}

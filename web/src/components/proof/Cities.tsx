import { useState } from "react";
import { Droplet, Leaf, MapPin, Moon, Sun } from "lucide-react";
import { JOB_STYLE, useApp } from "@/lib/data";
import { n0, pct, priorityLabel } from "@/format";
import { Illustrative } from "@/components/dashboard/Scene";
import type { CityPreset } from "@/types";

/** Stress bar for an Aqueduct score (0-5). */
function Stress({ score, label }: { score: number; label: string }) {
  const tone = score >= 4 ? "bg-rose-500" : score >= 3 ? "bg-amber-500" : "bg-yellow-400";
  return (
    <span className="flex items-center gap-2 text-[12px]">
      <span className="h-1.5 w-20 rounded-full bg-muted"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${(score / 5) * 100}%` }} /></span>
      <span className="font-semibold tabular-nums">{score.toFixed(2)}</span>
      <span className="text-muted-foreground">{label.replace(/ \(.*\)/, "")}</span>
    </span>
  );
}

function MiniPlan({ preset, schedule }: { preset: CityPreset; schedule: number[] }) {
  const { data } = useApp();
  const { sites, slots, options, jobs } = data.instance;
  return (
    <div className="grid grid-cols-2 gap-2">
      {sites.map((s) => (
        <div key={s.key} className="rounded-xl bg-muted/70 p-2">
          <p className="mb-1.5 text-[11px] font-semibold">{preset.sites[s.key as "evap" | "air"].city} · {s.cooling === "evaporative" ? "evaporative" : "air-cooled"}</p>
          {slots.map((t) => {
            const k = options.find((o) => o.site === s.key && o.slot === t.key)!.index;
            const here = jobs.map((_, j) => j).filter((j) => schedule[j] === k);
            return (
              <div key={t.key} className="mb-1 flex h-6 items-center gap-1 rounded-md bg-white px-1.5 ring-1 ring-border last:mb-0">
                {t.key === "day" ? <Sun className="size-3 shrink-0 text-amber-500" aria-hidden="true" /> : <Moon className="size-3 shrink-0 text-indigo-500" aria-hidden="true" />}
                {here.map((j) => (
                  <span key={j} className={`truncate rounded px-1 text-[10px] font-semibold ${JOB_STYLE[j].cls} ${JOB_STYLE[j].text}`}>{JOB_STYLE[j].short}</span>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Feature 4: same jobs, different cities. Water is weighted by regional water stress. */
export function Cities() {
  const { data } = useApp();
  const c = data.cities;
  const [w, setW] = useState(0.5);
  if (!c) return null;
  return (
    <section id="cities" className="scroll-mt-24 px-4 pb-24">
      <div className="mx-auto max-w-[1150px]">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
            Does the location matter?
            <span className="block text-foreground/45">A litre in Delhi isn&rsquo;t a litre in Kolkata.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[640px] text-[15px] text-muted-foreground">
            Water is weighted by each region&rsquo;s water stress (WRI Aqueduct 4.0). The plan is solved again for each city pair.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Priority">
            {[0, 0.5, 1].map((x) => (
              <button key={x} role="tab" aria-selected={w === x} onClick={() => setW(x)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${w === x ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {priorityLabel(x)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {c.presets.map((p) => {
            const s = p.sweep.find((x) => x.w === w)!;
            const savedRaw = p.naive.litres - s.litres;
            const savedW = p.naive.weighted_litres - s.weighted_litres;
            return (
              <article key={p.key} className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-border">
                <header className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-[18px] font-semibold tracking-tight">{p.label}</h3>
                </header>
                <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
                  {(["evap", "air"] as const).map((k) => (
                    <div key={k}>
                      <p className="text-[12px] font-medium">{p.sites[k].city} <span className="text-muted-foreground">({p.sites[k].state}) · Site {k === "evap" ? "A" : "B"}</span></p>
                      <Stress score={p.sites[k].score} label={p.sites[k].label} />
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">Water stress, 0–5, WRI Aqueduct 4.0 (state level)</p>
                </div>
                <MiniPlan preset={p} schedule={s.schedule} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-water-soft/60 p-3">
                    <p className="flex items-center gap-1 text-[12px] font-semibold text-water"><Droplet className="size-3.5" aria-hidden="true" /> Water saved</p>
                    <p className="mt-1 text-[22px] leading-none font-semibold text-blue-800 tabular-nums">{n0(savedRaw)} L</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{n0(savedW)} stress-weighted L · {pct(savedW / p.naive.weighted_litres)}</p>
                  </div>
                  <div className="rounded-2xl bg-carbon-soft/60 p-3">
                    <p className="flex items-center gap-1 text-[12px] font-semibold text-carbon"><Leaf className="size-3.5" aria-hidden="true" /> CO₂ saved</p>
                    <p className="mt-1 text-[22px] leading-none font-semibold text-emerald-800 tabular-nums">{n0(p.naive.kg_co2 - s.kg_co2)} kg</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{pct((p.naive.kg_co2 - s.kg_co2) / p.naive.kg_co2)} · same national grid</p>
                  </div>
                </div>
                <p className={`rounded-xl px-3 py-2 text-[12px] font-medium ${s.same_as_unweighted ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-900"}`}>
                  {s.same_as_unweighted
                    ? "Same plan as without stress weighting: both states are similarly stressed."
                    : "Stress weighting changes the plan: more water-heavy work moves to the less-stressed city."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  QAOA (simulator, balanced): {pct(p.qaoa_sim_balanced.share_best10)} of shots in the best tenth; {p.qaoa_sim_balanced.found_optimum ? "found the true best" : "missed the true best"}.
                </p>
              </article>
            );
          })}
        </div>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-[12px] text-muted-foreground">
          <Illustrative /> Which cities host the sites, and the mapping (weight = stress score ÷ 5), are illustrative. Scores are cited per state; power-plant water uses India&rsquo;s score ({c.india.score.toFixed(2)}). Grid carbon stays the CEA national average because India runs one national grid.
        </p>
      </div>
    </section>
  );
}

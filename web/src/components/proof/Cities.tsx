import { useState } from "react";
import { Droplet, Leaf, MapPin, Moon, Sun } from "lucide-react";
import { JOB_STYLE, useApp } from "@/lib/data";
import { n0, pct, priorityLabel } from "@/format";
import { Badge, Info, Segmented } from "@/components/slides/ui";
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
export function CitiesPanel() {
  const { data } = useApp();
  const c = data.cities;
  const [w, setW] = useState(0.5);
  if (!c) return null;
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-semibold">
          A litre in Delhi isn&rsquo;t a litre in Kolkata. <Badge kind="cited" label="WRI Aqueduct 4.0" />
          <Info>Water is weighted by state water stress (score ÷ 5). Which cities host the sites is illustrative. Grid carbon stays national (one grid).</Info>
        </p>
        <Segmented label="Priority" value={w} onChange={setW} options={[0, 0.5, 1].map((x) => ({ value: x, label: priorityLabel(x) }))} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
        {c.presets.map((p) => {
          const s = p.sweep.find((x) => x.w === w)!;
          const savedW = p.naive.weighted_litres - s.weighted_litres;
          return (
            <article key={p.key} className="flex min-h-0 flex-col gap-3 rounded-2xl bg-muted/50 p-4">
              <header className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-[17px] font-semibold tracking-tight">{p.label}</h3>
              </header>
              <div className="space-y-1.5">
                {(["evap", "air"] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{p.sites[k].city} <span className="text-muted-foreground">· Site {k === "evap" ? "A" : "B"}</span></span>
                    <Stress score={p.sites[k].score} label={p.sites[k].label} />
                  </div>
                ))}
              </div>
              <MiniPlan preset={p} schedule={s.schedule} />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-water-soft/60 p-2.5">
                  <p className="flex items-center gap-1 text-[12px] font-semibold text-water"><Droplet className="size-3.5" aria-hidden="true" /> Stress-weighted water</p>
                  <p className="mt-1 text-[20px] leading-none font-semibold text-blue-800 tabular-nums">−{pct(savedW / p.naive.weighted_litres)}</p>
                </div>
                <div className="rounded-xl bg-carbon-soft/60 p-2.5">
                  <p className="flex items-center gap-1 text-[12px] font-semibold text-carbon"><Leaf className="size-3.5" aria-hidden="true" /> CO₂</p>
                  <p className="mt-1 text-[20px] leading-none font-semibold text-emerald-800 tabular-nums">−{n0(p.naive.kg_co2 - s.kg_co2)} kg</p>
                </div>
              </div>
              <p className={`mt-auto rounded-xl px-3 py-2 text-[13px] font-medium ${s.same_as_unweighted ? "bg-white text-muted-foreground" : "bg-amber-50 text-amber-900"}`}>
                {s.same_as_unweighted ? "Same plan as unweighted." : "Plan changes: water-heavy work moves to the less-stressed city."}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

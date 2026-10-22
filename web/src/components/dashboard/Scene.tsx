import { useEffect, useRef } from "react";
import { LayoutGroup, animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowDown, ArrowRight, Droplet, Leaf, Moon, Sun } from "lucide-react";
import { JOB_STYLE, useApp, whyLines } from "@/lib/data";
import { n0, prefersReducedMotion } from "@/format";
import type { UiData } from "@/types";

const noDrag = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

export function Illustrative({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase ring-1 ring-amber-200 ${className}`}>
      Illustrative
    </span>
  );
}

/* --------------------------------------------------------------- buildings */

export function CoolingTower({ className = "" }: { className?: string }) {
  // Site A: evaporative cooling tower with a steam plume
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <g className="steam" fill="#cbd5e1">
        <circle cx="52" cy="18" r="9" opacity="0.7" />
        <circle cx="64" cy="12" r="11" opacity="0.55" />
        <circle cx="78" cy="16" r="8" opacity="0.45" />
      </g>
      <path d="M40 86 C46 62 46 46 42 30 L78 30 C74 46 74 62 80 86 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M44 40 L76 40 M44 54 L76 54 M43 68 L77 68" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="8" y="58" width="30" height="28" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="82" y="50" width="30" height="36" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M86 58h22M86 64h22M86 70h22M12 66h22M12 72h22" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M58 76 q2 -4 4 0 q-2 4 -4 0" fill="var(--water)" />
    </svg>
  );
}

export function ChillerBuilding({ className = "" }: { className?: string }) {
  // Site B: air-cooled chillers (rooftop fans)
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <rect x="12" y="44" width="96" height="42" rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M18 56h84M18 66h84M18 76h84" stroke="#cbd5e1" strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${30 + i * 30} 32)`}>
          <rect x="-12" y="-8" width="24" height="20" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <g className="fan">
            <circle r="7" fill="none" stroke="#64748b" strokeWidth="1.5" />
            <path d="M0 -6 L1.6 0 L0 6 L-1.6 0 Z M-6 0 L0 1.6 L6 0 L0 -1.6 Z" fill="#64748b" />
          </g>
        </g>
      ))}
      <path d="M22 18 q6 -6 12 0 M52 14 q6 -6 12 0 M82 18 q6 -6 12 0" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/* --------------------------------------------------------------- lanes + blocks */

/** Largest lane load among the schedules the UI can show; blocks are sized against it. */
export function maxLaneLoad(data: UiData) {
  const scheds = [data.naive.schedule, ...data.sweep.map((s) => s.best.schedule)];
  let max = 0;
  for (const s of scheds)
    for (let k = 0; k < data.instance.options.length; k++)
      max = Math.max(max, s.reduce((a, opt, j) => a + (opt === k ? data.instance.jobs[j].it_energy_kwh : 0), 0));
  return max;
}

export function JobBlock({ data, j, moved, compact = false, layoutPrefix }: { data: UiData; j: number; moved: boolean; compact?: boolean; layoutPrefix: string }) {
  const job = data.instance.jobs[j];
  const st = JOB_STYLE[j];
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      layoutId={`${layoutPrefix}-${job.key}`}
      transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.7, bounce: 0.18 }}
      className={`relative flex min-w-0 shrink-0 flex-col justify-center rounded-lg ${st.cls} ${st.text} ${compact ? "h-5 px-1" : "h-[58px] px-2.5"}`}
      style={{ width: `calc(${(job.it_energy_kwh / maxLaneLoad(data)) * 100}% - 4px)` }}
      title={`${job.label}: ${n0(job.it_energy_kwh)} kWh`}
    >
      {!compact && (
        <>
          <span className="truncate text-[13px] leading-tight font-semibold">{st.short}</span>
          <span className="truncate text-[11px] opacity-80">{n0(job.it_energy_kwh)} kWh</span>
        </>
      )}
      {moved && !compact && (
        <span className="absolute -top-2 -right-1.5 rounded-full bg-white px-1.5 py-px text-[10px] font-semibold text-foreground shadow ring-1 ring-border">moved</span>
      )}
    </motion.div>
  );
}

/* --------------------------------------------------------------- count-up */

function CountUp({ to, from }: { to: number; from: number }) {
  const mv = useMotionValue(from);
  const text = useTransform(mv, (v) => n0(v));
  useEffect(() => {
    if (prefersReducedMotion()) return void mv.set(to);
    const c = animate(mv, to, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [to, mv]);
  return <motion.span>{text}</motion.span>;
}

/* --------------------------------------------------------------- scene */

export function SceneWidget() {
  const { data, stop, view, setView } = useApp();
  const { sites, slots, jobs, options } = data.instance;
  const schedule = view === "greenq" ? stop.best.schedule : data.naive.schedule;
  const now = view === "greenq" ? stop.best : data.naive;
  const ref = useRef<HTMLDivElement>(null);

  // First time the scene is on screen, show business as usual, then let the jobs move.
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setTimeout(() => setView("greenq"), 1000);
        io.disconnect();
      }
    }, { threshold: 0.45 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const why = view === "greenq" ? whyLines(data, data.naive.schedule, stop.best.schedule) : [];
  const dCo2 = now.kg_co2 - data.naive.kg_co2;
  const dWater = now.litres - data.naive.litres;

  return (
    <section ref={ref} className="flex h-full flex-col gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-tight">Two data centres, two time slots</h3>
        <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Which schedule" {...noDrag}>
          {(["before", "greenq"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${view === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v === "before" ? "Business as usual" : "GreenQ"}
            </button>
          ))}
        </div>
      </header>

      <LayoutGroup id="scene">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          {sites.map((s) => (
            <div key={s.key} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-muted/70 p-3">
              <div className="flex items-center gap-3">
                {s.cooling === "evaporative" ? <CoolingTower className="h-14 w-[76px] shrink-0" /> : <ChillerBuilding className="h-14 w-[76px] shrink-0" />}
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold">{s.label.split(" (")[0]} <span className="font-normal text-muted-foreground">· {s.cooling === "evaporative" ? "evaporative cooling" : "air-cooled chillers"}</span></p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span>PUE {s.pue.toFixed(2)}</span>
                    <span className="flex items-center gap-1"><Droplet className="size-3 text-water" aria-hidden="true" /> {s.wue.day}/{s.wue.night} L/kWh on site (day/night)</span>
                    <Illustrative />
                  </p>
                </div>
              </div>
              {slots.map((t) => {
                const k = options.find((o) => o.site === s.key && o.slot === t.key)!.index;
                const here = jobs.map((_, j) => j).filter((j) => schedule[j] === k);
                const over = here.length > 1;
                return (
                  <div key={t.key} className={`flex min-h-[86px] flex-col gap-1.5 rounded-xl bg-white p-2.5 ring-1 transition-colors ${over ? "ring-2 ring-rose-300" : "ring-border"}`}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {t.key === "day" ? <Sun className="size-3.5 text-amber-500" aria-hidden="true" /> : <Moon className="size-3.5 text-indigo-500" aria-hidden="true" />}
                        {t.key === "day" ? "Day" : "Night"}
                        {over && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">Overloaded</span>}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground" title={data.instance.slot_note}>
                        grid {t.carbon_kg_per_kwh.toFixed(2)} kg CO₂/kWh
                        <span className="h-1.5 w-14 rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-carbon/70" style={{ width: `${(t.carbon_kg_per_kwh / 1) * 100}%` }} />
                        </span>
                      </span>
                    </div>
                    <div className="flex min-h-[58px] flex-1 items-center gap-1">
                      {here.map((j) => (
                        <JobBlock key={jobs[j].key} data={data} j={j} moved={view === "greenq" && data.naive.schedule[j] !== k} layoutPrefix="scene" />
                      ))}
                      {here.length === 0 && <span className="text-[12px] text-muted-foreground">free</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </LayoutGroup>

      <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] md:items-center">
        <Ticker icon="carbon" now={now.kg_co2} before={data.naive.kg_co2} delta={dCo2} unit="kg CO₂" />
        <Ticker icon="water" now={now.litres} before={data.naive.litres} delta={dWater} unit="L water" />
        <ul className="min-w-0 space-y-1 text-[12px] text-muted-foreground md:pl-2">
          {view === "before" ? (
            <li>Each job runs at its home site the moment it arrives. Jobs and sizes are <span className="font-semibold text-amber-800">illustrative</span>.</li>
          ) : (
            why.map((w) => (
              <li key={w.job} className="flex gap-1.5"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span>{w.text}</span></li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function Ticker({ icon, now, before, delta, unit }: { icon: "carbon" | "water"; now: number; before: number; delta: number; unit: string }) {
  const carbon = icon === "carbon";
  const Icon = carbon ? Leaf : Droplet;
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${carbon ? "bg-carbon-soft/60" : "bg-water-soft/60"}`}>
      <Icon className={`size-6 ${carbon ? "text-carbon" : "text-water"}`} aria-hidden="true" />
      <div>
        <p className={`text-[28px] leading-none font-semibold tracking-tight tabular-nums ${carbon ? "text-emerald-800" : "text-blue-800"}`}>
          <CountUp from={before} to={now} />
          <span className="ml-1 text-[13px] font-medium text-muted-foreground">{unit}</span>
        </p>
        <p className={`mt-1 flex items-center gap-1 text-[12px] font-semibold ${delta < 0 ? (carbon ? "text-carbon" : "text-water") : "text-muted-foreground"}`}>
          {delta < 0 ? <ArrowDown className="size-3" aria-hidden="true" /> : null}
          {delta < 0 ? `${n0(-delta)} less than business as usual` : "business as usual"}
        </p>
      </div>
    </div>
  );
}

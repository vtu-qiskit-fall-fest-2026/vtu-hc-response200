import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Droplet, Leaf } from "lucide-react";
import { useApp } from "@/lib/data";
import { n0, pct, priorityLabel, prefersReducedMotion } from "@/format";

const noDrag = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

/* --------------------------------------------------------------- priority + trade-off */

export function PriorityWidget() {
  const { data, idx, setIdx, stop, onHardware, sweep, preset, setPreset } = useApp();
  const last = sweep.length - 1;
  return (
    <section className="grid h-full gap-5 p-5 md:grid-cols-[1.25fr_1fr]">
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[20px] font-semibold tracking-tight">What matters more?</h3>
          {onHardware ? (
            <span className="flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-[12px] font-semibold text-white">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Run on real IBM hardware
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground">Best of all {data.instance.n_schedules}, by exhaustive check</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" {...noDrag}>
          <span className="text-[12px] font-medium text-muted-foreground">How flexible are the jobs?</span>
          <div className="flex rounded-full bg-muted p-0.5" role="tablist" aria-label="Job flexibility">
            {data.flex.presets.map((p) => (
              <button key={p.key} role="tab" aria-selected={p.key === preset.key} onClick={() => setPreset(p.key)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${p.key === preset.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">{preset.allowed_schedules} allowed schedules</span>
        </div>
        <p className="mt-3 text-[40px] leading-none font-semibold tracking-tight">{priorityLabel(stop.w)}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-carbon-soft/60 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-carbon"><Leaf className="size-4" aria-hidden="true" /> CO₂ saved</p>
            <p className="mt-1 text-[32px] leading-none font-semibold tracking-tight text-emerald-800 tabular-nums">{n0(stop.saved_kg_co2)}<span className="ml-1 text-[14px] font-medium text-muted-foreground">kg · {pct(stop.saved_kg_co2 / data.naive.kg_co2)}</span></p>
          </div>
          <div className="rounded-2xl bg-water-soft/60 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-water"><Droplet className="size-4" aria-hidden="true" /> Water saved</p>
            <p className="mt-1 text-[32px] leading-none font-semibold tracking-tight text-blue-800 tabular-nums">{n0(stop.saved_litres)}<span className="ml-1 text-[14px] font-medium text-muted-foreground">L · {pct(stop.saved_litres / data.naive.litres)}</span></p>
          </div>
        </div>
        {preset.qaoa && <div className="mt-3"><RuleStatsLine /></div>}
        <div id="prio-slider" className="mt-auto scroll-mt-24 pt-6" {...noDrag}>
          <div className="mb-2 flex justify-between text-[14px] font-semibold">
            <span className="flex items-center gap-1.5 text-water"><Droplet className="size-4" aria-hidden="true" /> Save water</span>
            <span className="flex items-center gap-1.5 text-carbon">Cut carbon <Leaf className="size-4" aria-hidden="true" /></span>
          </div>
          <input
            className="prio-range prio-range--big"
            type="range"
            min={0}
            max={last}
            step={1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            aria-label="Priority between saving water and cutting carbon"
            aria-valuetext={`${priorityLabel(stop.w)}${stop.hardware ? ", run on real IBM hardware" : ""}`}
          />
          <div className="relative mt-1 h-9" aria-hidden="true">
            {sweep.map((s, i) => (
              <span key={s.w} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `calc(14px + (100% - 28px) * ${i / last})` }}>
                <span className={`w-px ${s.hardware ? "h-2.5 bg-foreground" : "h-1.5 bg-foreground/30"} ${i === idx ? "bg-foreground" : ""}`} />
                {s.hardware && (
                  <button tabIndex={-1} onClick={() => setIdx(i)} className="mt-1 rounded bg-foreground px-1.5 py-px text-[10px] font-bold tracking-wide text-white">
                    IBM
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
      <TradeOff />
    </section>
  );
}

function TradeOff() {
  const { idx, setIdx, sweep } = useApp();
  const pts = sweep.map((s) => ({ x: s.saved_kg_co2, y: s.saved_litres, hw: s.hardware }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs) - 30, Math.max(...xs) + 30];
  const [y0, y1] = [Math.min(...ys) - 150, Math.max(...ys) + 150];
  const W = 360, H = 230, L = 48, B = 34, T = 10, R = 12;
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const cur = pts[idx];
  const reduced = prefersReducedMotion();
  return (
    <figure className="flex min-w-0 flex-col" {...noDrag}>
      <figcaption className="text-[13px] font-medium text-muted-foreground">The trade-off: every priority setting</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 min-h-0 w-full flex-1" role="img" aria-label={`Trade-off curve: CO2 saved from ${n0(Math.min(...xs))} to ${n0(Math.max(...xs))} kg against water saved from ${n0(Math.min(...ys))} to ${n0(Math.max(...ys))} litres. Saving more of one saves less of the other.`}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--border)" />
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--border)" />
        {[Math.min(...xs), Math.max(...xs)].map((v) => (
          <text key={v} x={sx(v)} y={H - B + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">{n0(v)}</text>
        ))}
        {[Math.min(...ys), Math.max(...ys)].map((v) => (
          <text key={v} x={L - 6} y={sy(v) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{n0(v)}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="fill-emerald-700 text-[11px] font-semibold">kg CO₂ saved →</text>
        <text x={12} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(T + H - B) / 2})`} className="fill-blue-700 text-[11px] font-semibold">litres saved →</text>
        <motion.path
          d={path}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="4 4"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        {pts.map((p, i) => (
          <g key={i} onClick={() => setIdx(i)} className="cursor-pointer">
            {p.hw && <circle cx={sx(p.x)} cy={sy(p.y)} r={9} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />}
            <circle cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="#cbd5e1" />
          </g>
        ))}
        <motion.circle r={7} fill="var(--carbon)" stroke="white" strokeWidth={2.5} animate={{ cx: sx(cur.x), cy: sy(cur.y) }} transition={{ type: "spring", visualDuration: 0.4, bounce: 0.2 }} />
      </svg>
      <p className="text-[11px] text-muted-foreground">Ringed points ran on IBM hardware. Several settings share the same best schedule.</p>
    </figure>
  );
}

/* --------------------------------------------------------------- savings */

export function SavingsWidget() {
  const { data, stop } = useApp();
  const rows = [
    { key: "carbon", Icon: Leaf, label: "CO₂", unit: "kg", before: data.naive.kg_co2, after: stop.best.kg_co2, fill: "bg-carbon", text: "text-carbon" },
    { key: "water", Icon: Droplet, label: "Water", unit: "L", before: data.naive.litres, after: stop.best.litres, fill: "bg-water", text: "text-water" },
  ];
  return (
    <section className="flex h-full flex-col gap-3 p-5">
      <h3 className="text-[20px] font-semibold tracking-tight">Savings vs business as usual</h3>
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col justify-center gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`flex items-center gap-2 text-[15px] font-semibold ${r.text}`}><r.Icon className="size-5" aria-hidden="true" /> {r.label}</span>
            <span className={`text-[34px] leading-none font-semibold tracking-tight tabular-nums ${r.text}`}>
              −{n0(r.before - r.after)}<span className="ml-1 text-[14px] font-medium text-muted-foreground">{r.unit} · {pct((r.before - r.after) / r.before)}</span>
            </span>
          </div>
          {[
            { label: "Business as usual", v: r.before, cls: "bg-foreground/15" },
            { label: "GreenQ", v: r.after, cls: r.fill },
          ].map((b) => (
            <div key={b.label} className="grid grid-cols-[132px_1fr] items-center gap-3 text-[13px]">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="relative h-7 rounded-lg bg-muted">
                <motion.span className={`absolute inset-y-0 left-0 rounded-lg ${b.cls}`} animate={{ width: `${(b.v / r.before) * 100}%` }} transition={{ type: "spring", visualDuration: 0.5, bounce: 0 }} />
                <span className="absolute inset-y-0 right-2 flex items-center font-semibold tabular-nums">{n0(b.v)} {r.unit}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
      <FlexCurve />
    </section>
  );
}

/** Feature 2: savings shrink as fewer jobs are flexible (averaged over every subset). */
function FlexCurve() {
  const { data } = useApp();
  const c = data.flex.curve;
  const W = 300, H = 110, L = 30, B = 22, T = 8, R = 8;
  const maxY = Math.max(...c.flatMap((p) => [p.co2_saved_pct, p.water_saved_pct]), 1);
  const sx = (x: number) => L + x * (W - L - R);
  const sy = (y: number) => T + (1 - y / maxY) * (H - T - B);
  const line = (k: "co2_saved_pct" | "water_saved_pct") => c.map((p, i) => `${i ? "L" : "M"}${sx(p.flexible_share)},${sy(p[k])}`).join(" ");
  return (
    <figure className="mt-auto rounded-2xl bg-muted/60 p-3">
      <figcaption className="flex items-center justify-between text-[12px] font-medium">
        <span>Savings vs share of flexible jobs</span>
        <span className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-carbon" />CO₂</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-water" />water</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`Savings fall as fewer jobs are flexible: ${c.map((p) => `${Math.round(p.flexible_share * 100)}% flexible, ${p.co2_saved_pct.toFixed(0)}% CO2 and ${p.water_saved_pct.toFixed(0)}% water saved`).join("; ")}.`}>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--border)" />
        {c.map((p) => (
          <text key={p.flexible_share} x={sx(p.flexible_share)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {Math.round(p.flexible_share * 100)}%
          </text>
        ))}
        <text x={L - 4} y={sy(maxY) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{maxY.toFixed(0)}%</text>
        <text x={L - 4} y={sy(0) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">0</text>
        <path d={line("co2_saved_pct")} fill="none" stroke="var(--carbon)" strokeWidth={2.2} />
        <path d={line("water_saved_pct")} fill="none" stroke="var(--water)" strokeWidth={2.2} strokeDasharray="5 3" />
        {c.map((p) => (
          <g key={p.flexible_share}>
            <circle cx={sx(p.flexible_share)} cy={sy(p.co2_saved_pct)} r={2.8} fill="var(--carbon)" />
            <circle cx={sx(p.flexible_share)} cy={sy(p.water_saved_pct)} r={2.8} fill="var(--water)" />
          </g>
        ))}
      </svg>
      <p className="text-[11px] text-muted-foreground">Average over every choice of which jobs are flexible; the rest stay at home, on time. Balanced priority. Illustrative.</p>
    </figure>
  );
}

/** Feature 2: did the quantum runs respect the job rules? */
function RuleStatsLine() {
  const { preset } = useApp();
  const q = preset.qaoa!;
  const items = [
    { label: "Random guessing", v: q.ideal.share_obeying_rules_random, cls: "text-muted-foreground" },
    { label: "Simulator", v: q.ideal.share_obeying_rules, cls: "text-emerald-800" },
    ...(q.hardware ? [{ label: `IBM ${q.hardware.backend}`, v: q.hardware.share_obeying_rules, cls: "text-foreground" }] : []),
  ];
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-border">
      <p className="text-[12px] font-medium">Shots that obey every job rule <span className="text-muted-foreground">· balanced priority</span></p>
      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
        {items.map((it) => (
          <span key={it.label} className="text-[12px] text-muted-foreground">
            {it.label} <b className={`text-[18px] tabular-nums ${it.cls}`}>{pct(it.v)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- hardware runs */

export function RunsWidget() {
  const { data, proof } = useApp();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (id: string) => {
    navigator.clipboard?.writeText(id).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1400);
    });
  };
  return (
    <section className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[20px] font-semibold tracking-tight">Real IBM runs</h3>
        <span className="font-mono text-[12px] text-muted-foreground">{data.proof[0].hardware[0].backend}</span>
      </div>
      <ul className="flex flex-1 flex-col justify-center gap-1.5" {...noDrag}>
        {data.flex.presets.filter((p) => p.qaoa?.hardware).map((p) => {
          const h = p.qaoa!.hardware!;
          return (
            <li key={h.job_id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-muted px-3 py-2 text-[12px]">
              <span className="min-w-0">
                <span className="block truncate font-mono text-[12.5px] text-foreground">{h.job_id}</span>
                <span className="text-muted-foreground">{p.label} rules · balanced · raw · {n0(h.shots)} shots · {h.quantum_seconds} s</span>
              </span>
              <button onClick={() => copy(h.job_id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" aria-label={`Copy job ID ${h.job_id}`}>
                {copied === h.job_id ? <Check className="size-4 text-carbon" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
        {data.proof.flatMap((p) =>
          p.hardware.map((h) => {
            const active = p.w === proof.w;
            return (
              <li key={h.job_id} className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-3 py-2 text-[12px] ${active ? "bg-foreground/[0.06] ring-1 ring-foreground/15" : "bg-muted"}`}>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[12.5px] text-foreground">{h.job_id}</span>
                  <span className="text-muted-foreground">{priorityLabel(p.w)} · {h.mitigation === "none" ? "raw" : "error-mitigated"} · {n0(h.shots)} shots · {h.quantum_seconds} s</span>
                </span>
                <button onClick={() => copy(h.job_id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" aria-label={`Copy job ID ${h.job_id}`}>
                  {copied === h.job_id ? <Check className="size-4 text-carbon" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </button>
              </li>
            );
          }),
        )}
      </ul>
      <p className="text-[12px] text-muted-foreground">{data.totals.hardware_jobs} runs · {data.totals.quantum_seconds} s of quantum time · every shot saved in results/hardware/</p>
    </section>
  );
}

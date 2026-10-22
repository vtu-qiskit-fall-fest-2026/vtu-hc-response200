import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  ArrowDown,
  Atom,
  CircleCheck,
  Cloud,
  Droplets,
  Moon,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useDash, mitigationDeltas } from "@/lib/data";
import { n0, pct, priorityLabel, prefersReducedMotion } from "@/format";

/** Controls inside a draggable widget must not start a drag. */
const noDrag = { onPointerDown: (e: PointerEvent) => e.stopPropagation() };

function Shell({ title, icon: Icon, meta, children }: { title: string; icon: LucideIcon; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="@container flex h-full flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate">{title}</span>
        </h3>
        {meta && <div className="shrink-0 text-[12px] text-muted-foreground">{meta}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function Big({ children, unit, className = "" }: { children: ReactNode; unit?: string; className?: string }) {
  return (
    <p className={`text-[40px] leading-none font-semibold tracking-tight tabular-nums @max-[230px]:text-[30px] ${className}`}>
      {children}
      {unit && <span className="ml-1.5 text-[15px] font-medium tracking-normal text-muted-foreground">{unit}</span>}
    </p>
  );
}

function Chip({ tone, children }: { tone: "carbon" | "water" | "neutral" | "hw"; children: ReactNode }) {
  const cls = {
    carbon: "bg-carbon-soft text-emerald-800",
    water: "bg-water-soft text-blue-800",
    neutral: "bg-muted text-muted-foreground",
    hw: "bg-foreground text-white",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${cls}`}>{children}</span>;
}

/* ------------------------------------------------------------------ savings */

function Saving({ kind }: { kind: "carbon" | "water" }) {
  const { data, stop } = useDash();
  const carbon = kind === "carbon";
  const before = carbon ? data.naive.kg_co2 : data.naive.litres;
  const after = carbon ? stop.best.kg_co2 : stop.best.litres;
  const saved = carbon ? stop.saved_kg_co2 : stop.saved_litres;
  const fill = carbon ? "bg-carbon" : "bg-water";
  return (
    <Shell title={carbon ? "CO₂ saved" : "Water saved"} icon={carbon ? Cloud : Droplets} meta={<Chip tone={kind}><ArrowDown className="size-3" aria-hidden="true" /> {pct(saved / before)}</Chip>}>
      <Big unit={carbon ? "kg" : "litres"} className={carbon ? "text-carbon" : "text-water"}>
        {n0(saved)}
      </Big>
      <div className="mt-auto space-y-1.5 text-[12px] text-muted-foreground">
        {[
          { label: "Before", v: before, cls: "bg-foreground/15" },
          { label: "GreenQ", v: after, cls: fill },
        ].map((r) => (
          <div key={r.label} className="grid grid-cols-[52px_1fr_auto] items-center gap-2">
            <span>{r.label}</span>
            <span className="h-1.5 rounded-full bg-muted">
              <motion.span className={`block h-full rounded-full ${r.cls}`} animate={{ width: `${(r.v / before) * 100}%` }} transition={{ type: "spring", visualDuration: 0.5, bounce: 0 }} />
            </span>
            <span className="tabular-nums text-foreground">{n0(r.v)}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export const CarbonWidget = () => <Saving kind="carbon" />;
export const WaterWidget = () => <Saving kind="water" />;

/* ------------------------------------------------------------------ priority */

export function PriorityWidget() {
  const { data, idx, setIdx, stop } = useDash();
  const last = data.sweep.length - 1;
  return (
    <Shell
      title="Priority"
      icon={SlidersHorizontal}
      meta={stop.hardware ? <Chip tone="hw"><span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Real IBM hardware</Chip> : <Chip tone="neutral">Exhaustive check</Chip>}
    >
      <p className="text-[22px] font-semibold tracking-tight">{priorityLabel(stop.w)}</p>
      <div className="mt-auto" {...noDrag}>
        <div className="mb-1 flex justify-between text-[12px] font-medium">
          <span className="flex items-center gap-1 text-water"><Droplets className="size-3.5" aria-hidden="true" /> Save water</span>
          <span className="flex items-center gap-1 text-carbon">Cut carbon <Cloud className="size-3.5" aria-hidden="true" /></span>
        </div>
        <input
          className="prio-range"
          type="range"
          min={0}
          max={last}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          aria-label="Priority between saving water and cutting carbon"
          aria-valuetext={`${priorityLabel(stop.w)}${stop.hardware ? ", run on real IBM hardware" : ""}`}
        />
        <div className="relative mt-1 h-5" aria-hidden="true">
          {data.sweep.map((s, i) =>
            s.hardware ? (
              <button
                key={s.w}
                tabIndex={-1}
                onClick={() => setIdx(i)}
                className="absolute -translate-x-1/2 rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-white"
                style={{ left: `calc(12px + (100% - 24px) * ${i / last})` }}
              >
                IBM
              </button>
            ) : null,
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ schedule */

const JOB_DOTS = ["bg-violet-500", "bg-amber-500", "bg-sky-500", "bg-pink-500"];

export function ScheduleWidget() {
  const { data, stop } = useDash();
  const { sites, slots, jobs, options } = data.instance;
  const [view, setView] = useState<"before" | "greenq">(prefersReducedMotion() ? "greenq" : "before");
  const ref = useRef<HTMLDivElement>(null);

  // Show business as usual first, then let the jobs move once the widget is in view.
  useEffect(() => {
    if (view === "greenq" || !ref.current) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setTimeout(() => setView("greenq"), 900);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const schedule = view === "greenq" ? stop.best.schedule : data.naive.schedule;
  const total = view === "greenq" ? stop.best : data.naive;
  const bay = (s: string, t: string) => options.find((o) => o.site === s && o.slot === t)!.index;

  return (
    <Shell
      title="Where each job runs"
      icon={Scale}
      meta={
        <div className="flex rounded-full bg-muted p-0.5" role="tablist" aria-label="Schedule" {...noDrag}>
          {(["before", "greenq"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${view === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v === "before" ? "Business as usual" : "GreenQ"}
            </button>
          ))}
        </div>
      }
    >
      <div ref={ref} className="grid min-w-0 flex-1 grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] grid-rows-[auto_1fr_1fr] gap-2 @max-[360px]:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)]">
        <span />
        {slots.map((t) => (
          <span key={t.key} className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            {t.key === "day" ? <Sun className="size-3.5" aria-hidden="true" /> : <Moon className="size-3.5" aria-hidden="true" />}
            {t.key === "day" ? "Day" : "Night"}
          </span>
        ))}
        <LayoutGroup id="schedule">
          {sites.map((s) => [
            <span key={s.key} className="flex flex-col justify-center text-[12px] leading-tight">
              <span className="font-semibold text-foreground">{s.label.split(" (")[0]}</span>
              <span className="text-muted-foreground @max-[360px]:hidden">{s.cooling === "evaporative" ? "evaporative" : "air-cooled"}</span>
            </span>,
            ...slots.map((t) => {
              const k = bay(s.key, t.key);
              const here = jobs.map((_, j) => j).filter((j) => schedule[j] === k);
              const over = here.length > 1;
              return (
                <div
                  key={`${s.key}-${t.key}`}
                  className={`flex min-w-0 flex-col gap-1.5 rounded-xl p-2 transition-colors ${over ? "bg-rose-50 ring-1 ring-rose-300" : "bg-muted"}`}
                >
                  {here.map((j) => (
                    <motion.div
                      key={jobs[j].key}
                      layoutId={`job-${jobs[j].key}`}
                      transition={{ type: "spring", visualDuration: 0.55, bounce: 0.15 }}
                      className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-[12px] shadow-sm ring-1 ring-border"
                    >
                      <span className={`size-2 shrink-0 rounded-full ${JOB_DOTS[j]}`} aria-hidden="true" />
                      <span className="truncate font-medium">{jobs[j].label}</span>
                    </motion.div>
                  ))}
                  {over && <span className="mt-auto text-[11px] font-medium text-rose-600">Overloaded</span>}
                </div>
              );
            }),
          ])}
        </LayoutGroup>
      </div>
      <p className="mt-3 flex justify-between text-[12px] text-muted-foreground">
        <span><span className="font-semibold text-carbon">{n0(total.kg_co2)} kg</span> CO₂</span>
        <span><span className="font-semibold text-water">{n0(total.litres)} L</span> water</span>
      </p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ quantum proof */

export function ProofWidget() {
  const { proof, onHardware } = useDash();
  const raw = proof.hardware.find((h) => h.mitigation === "none")!;
  const mit = proof.hardware.find((h) => h.mitigation === "dd_twirl")!;
  const rows = [
    { label: "Random guessing", v: proof.random.share_best10, cls: "bg-foreground/20" },
    { label: "IBM hardware", v: raw.share_best10, cls: "bg-foreground" },
    { label: "IBM + mitigation", v: mit.share_best10, cls: "bg-foreground/70" },
    { label: "Perfect simulator", v: proof.ideal?.share_best10 ?? 0, cls: "bg-carbon" },
  ];
  return (
    <Shell title="Quantum vs random" icon={Atom} meta={onHardware ? priorityLabel(proof.w) : `${priorityLabel(proof.w)} setting`}>
      <p className="text-[12px] text-muted-foreground">Shots landing in the best 10% of schedules</p>
      <div className="mt-auto space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[120px_1fr_44px] items-center gap-2 text-[12px] @max-[380px]:grid-cols-[104px_1fr_40px]">
            <span className="truncate text-foreground">{r.label}</span>
            <span className="h-2 rounded-full bg-muted">
              <motion.span className={`block h-full rounded-full ${r.cls}`} animate={{ width: `${(r.v / 0.4) * 100}%` }} transition={{ type: "spring", visualDuration: 0.5, bounce: 0 }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{pct(r.v, 1)}</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-muted-foreground">Error mitigation gave no consistent gain across settings.</p>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ hardware runs */

export function RunsWidget() {
  const { data, proof } = useDash();
  return (
    <Shell title="IBM hardware runs" icon={ShieldCheck} meta={<span className="font-mono">{proof.hardware[0].backend}</span>}>
      <ul className="mt-auto space-y-2">
        {proof.hardware.map((h) => (
          <li key={h.job_id} className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2 text-[12px]">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="truncate font-mono text-foreground">{h.job_id}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">{h.mitigation === "none" ? "raw" : "mitigated"} · {n0(h.shots)} shots</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {data.totals.hardware_jobs} runs in total · {data.totals.quantum_seconds} s of quantum time · results saved in the repo
      </p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ small facts */

export function QubitsWidget() {
  const { data } = useDash();
  const c = data.circuit;
  return (
    <Shell title="Qubits used" icon={Atom}>
      <Big>{c.n_qubits}</Big>
      <div className="mt-auto space-y-2 text-[12px] text-muted-foreground">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: c.onehot_qubits }, (_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${i < c.n_qubits ? "bg-foreground" : "bg-foreground/10"}`} />
          ))}
        </div>
        <p>Half the textbook method ({c.onehot_qubits}). 2 per job: where + when.</p>
      </div>
    </Shell>
  );
}

export function BestWidget() {
  const { data, proof, onHardware } = useDash();
  const raw = proof.hardware.find((h) => h.mitigation === "none")!;
  return (
    <Shell title="Best schedule" icon={CircleCheck}>
      <Big className="text-carbon">Found</Big>
      <p className="mt-auto text-[12px] text-muted-foreground">
        Matches the true best of all {data.instance.n_schedules}.{" "}
        {onHardware ? `Seen ${raw.optimum_hits}× in ${n0(raw.shots)} hardware shots (random ≈ ${n0(proof.random.expected_optimum_hits)}).` : "Checked by brute force."}
      </p>
    </Shell>
  );
}

export function MitigationWidget() {
  const { data } = useDash();
  const d = mitigationDeltas(data);
  return (
    <Shell title="Error mitigation" icon={ShieldCheck}>
      <Big>No gain</Big>
      <p className="mt-auto text-[12px] text-muted-foreground">
        Change in quality score: {d.map((x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(3)}`).join(" · ")}. Not consistent.
      </p>
    </Shell>
  );
}

export function RefereeWidget() {
  const { data } = useDash();
  return (
    <Shell title="The referee" icon={Scale}>
      <Big unit="checked">{data.instance.n_schedules}</Big>
      <p className="mt-auto text-[12px] text-muted-foreground">A laptop checks every schedule instantly. No quantum advantage is claimed.</p>
    </Shell>
  );
}

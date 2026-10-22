import { useEffect, useState, type ReactNode } from "react";
import type { UiData } from "@/types";
import { LayoutGroup } from "motion/react";
import { CircleCheck, Cpu, Moon, Sun } from "lucide-react";
import { hardwareShareRange, mitigationDeltas, signed3, useApp } from "@/lib/data";
import { n0, pct, prefersReducedMotion } from "@/format";
import { ChillerBuilding, CoolingTower, JobBlock } from "@/components/dashboard/Scene";


/* ------------------------------------------------------------------ brand + nav */

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--carbon)" strokeWidth="2.4" />
        <path d="M12 12l6.5 6.5" stroke="var(--water)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" fill="var(--carbon)" />
      </svg>
      GreenQ
    </span>
  );
}

/* ------------------------------------------------------------------ hero */

/** Run now -> Run smart, once (no looping). Click to flip back and forth. */
export function MiniScene() {
  const { data } = useApp();
  const best = data.sweep.find((s) => s.w === 0.5)!.best.schedule;
  const [greenq, setGreenq] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setTimeout(() => setGreenq(true), 1800);
    return () => window.clearTimeout(t);
  }, []);
  const sched = greenq ? best : data.naive.schedule;
  const { sites, slots, options, jobs } = data.instance;
  return (
    <button
      type="button"
      onClick={() => setGreenq((g) => !g)}
      className="block w-full rounded-3xl bg-white p-5 text-left shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] ring-1 ring-border"
      aria-label={`Example schedule, showing ${greenq ? "Run smart" : "Run now"}. Click to switch.`}
    >
      <div className="mb-4 flex items-center justify-between text-[15px]">
        <span className="font-semibold">{greenq ? "Run smart" : "Run now"}</span>
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${greenq ? "bg-carbon-soft text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
          {greenq ? "spread out, cleaner slots" : "Site A crowded at night"}
        </span>
      </div>
      <LayoutGroup id="mini">
        <div className="grid grid-cols-2 gap-3">
          {sites.map((s) => (
            <div key={s.key} className="rounded-2xl bg-muted/70 p-3">
              <div className="mb-2.5 flex items-center gap-2">
                {s.cooling === "evaporative" ? <CoolingTower className="h-10 w-14" /> : <ChillerBuilding className="h-10 w-14" />}
                <span className="text-[14px] font-semibold">{s.label.split(" (")[0]}</span>
              </div>
              {slots.map((t) => {
                const k = options.find((o) => o.site === s.key && o.slot === t.key)!.index;
                const here = jobs.map((_, j) => j).filter((j) => sched[j] === k);
                return (
                  <div key={t.key} className={`mb-2 flex h-12 items-center gap-1 rounded-lg bg-white px-2 ring-1 last:mb-0 ${here.length > 1 ? "ring-2 ring-rose-300" : "ring-border"}`}>
                    {t.key === "day" ? <Sun className="size-4 shrink-0 text-amber-500" aria-hidden="true" /> : <Moon className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />}
                    {here.map((j) => <JobBlock key={jobs[j].key} data={data} j={j} moved={false} compact layoutPrefix="mini" />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </button>
  );
}

/* ------------------------------------------------------------------ how it works */

const MiniCard = ({ children }: { children: ReactNode }) => (
  <div className="w-full max-w-[300px] rounded-2xl bg-white p-4 text-left shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] ring-1 ring-border">{children}</div>
);

/** The three steps (Encode, Run, Check) with a small picture each. */
export function steps(data: UiData) {
  const raw = data.proof[1].hardware.find((h) => h.mitigation === "none")!;
  const best = data.sweep[10].best;
  return [
    {
      tint: "bg-emerald-50", label: "1 · Encode", title: `${data.circuit.n_qubits} qubits, 2 per job`,
      text: `A where and a when qubit per job. Every reading is a valid schedule (textbook: ${data.circuit.onehot_qubits} qubits).`,
      art: (
        <MiniCard>
          {data.instance.jobs.map((j, i) => {
            const k = best.schedule[i]; // bit 1 = where (site), bit 0 = when (slot)
            return (
              <div key={j.key} className="flex items-center justify-between border-b border-border py-1.5 text-[13px] last:border-0">
                <span className="font-medium">{j.label}</span>
                <span className="flex gap-1">
                  <span className="rounded bg-muted px-1.5">Site {k >> 1 ? "B" : "A"}</span>
                  <span className="rounded bg-muted px-1.5">{k & 1 ? "Night" : "Day"}</span>
                </span>
              </div>
            );
          })}
        </MiniCard>
      ),
    },
    {
      tint: "bg-amber-50", label: "2 · Run", title: "QAOA on IBM hardware",
      text: `One layer, ${raw.two_qubit_gates} two-qubit gates on ${raw.backend}. ${data.totals.hardware_jobs} runs, ${data.totals.quantum_seconds} s.`,
      art: (
        <MiniCard>
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-1.5 font-medium"><Cpu className="size-3.5" aria-hidden="true" /> {raw.backend}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Completed</span>
          </div>
          <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden="true">
            {raw.deciles.map((d, i) => (
              <span key={i} className={`flex-1 rounded-t ${i === 0 ? "bg-carbon" : "bg-foreground/15"}`} style={{ height: `${(d / 0.25) * 100}%` }} />
            ))}
          </div>
        </MiniCard>
      ),
    },
    {
      tint: "bg-blue-50", label: "3 · Check", title: "A laptop is the referee",
      text: `Graded against the true best of all ${data.instance.n_schedules} schedules.`,
      art: (
        <MiniCard>
          <div className="flex items-center gap-2 text-[14px] font-semibold"><CircleCheck className="size-4 text-carbon" aria-hidden="true" /> True best found</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">CO₂</p><p className="font-semibold text-carbon">{n0(best.kg_co2)} kg</p></div>
            <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">Water</p><p className="font-semibold text-water">{n0(best.litres)} L</p></div>
          </div>
        </MiniCard>
      ),
    },
  ];
}

/** Honest one-line answers to the questions a jury asks. */
export function faqItems(data: UiData): [string, string][] {
  const [lo, hi] = hardwareShareRange(data);
  const d = mitigationDeltas(data).map(signed3).join(", ");
  return [
    ["Faster than a laptop?", `No. A laptop checks all ${data.instance.n_schedules} schedules instantly and grades every answer.`],
    ["What did IBM's machine do?", `${pct(lo)}–${pct(hi)} of shots in the best tenth; random guessing puts 10% there.`],
    ["Compared with what?", "Run now: every job at its home site, the moment it arrives."],
    ["Are the numbers real?", "Grid carbon and power-plant water are cited. Sites, jobs and day/night are illustrative."],
    ["Did error mitigation help?", `Not consistently (${d}).`],
    ["What does the AI do?", "Explains saved results in words. It never picks the schedule; unmatched numbers are dropped."],
  ];
}

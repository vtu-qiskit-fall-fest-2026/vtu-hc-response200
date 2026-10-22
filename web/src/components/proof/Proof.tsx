import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { pct, prefersReducedMotion } from "@/format";
import type { Gate, UiData } from "@/types";

/* --------------------------------------------------------------- circuit */

type Col = { label: "h" | "rz" | "zz" | "zzzz" | "rx" | "measure"; gates: Gate[] };

/** Pack gates into columns; multi-qubit gates share a column when their spans don't overlap. */
function columns(gates: Gate[]): Col[] {
  const out: Col[] = [];
  for (const g of gates) {
    if (g.kind === "h" || g.kind === "rx" || g.kind === "measure") {
      out.push({ label: g.kind, gates: [g] });
      continue;
    }
    if (g.kind === "rz") {
      const last = out[out.length - 1];
      if (last?.label === "rz") last.gates.push(g);
      else out.push({ label: "rz", gates: [g] });
      continue;
    }
    const lo = Math.min(...g.qubits), hi = Math.max(...g.qubits);
    const col = out.find(
      (c) => c.label === g.kind && c.gates.every((x) => Math.max(...x.qubits) < lo || Math.min(...x.qubits) > hi),
    );
    if (col) col.gates.push(g);
    else out.push({ label: g.kind, gates: [g] });
  }
  return out;
}

/** Seconds until the circuit has fully lit up (used to time the histogram). */
const STEP = 0.055;
export const circuitLitAt = (gates: Gate[]) => columns(gates).length * STEP + 0.3;

export function Circuit({ data, gates, gamma, beta }: { data: UiData; gates: Gate[]; gamma: number; beta: number }) {
  const reduced = prefersReducedMotion();
  const n = data.circuit.n_qubits;
  const cols = columns(gates);
  const ROW = 34, TOP = 44, LEFT = 170, COLW = 30, RIGHT = 20;
  const W = LEFT + cols.length * COLW + RIGHT;
  const H = TOP + n * ROW + 10;
  const y = (q: number) => TOP + q * ROW + ROW / 2;
  const x = (c: number) => LEFT + c * COLW + COLW / 2;
  const meaning = data.circuit.qubit_meaning;
  const costStart = cols.findIndex((c) => c.label === "rz");
  let costEnd = costStart;
  cols.forEach((c, i) => { if (c.label === "zz" || c.label === "zzzz") costEnd = i; });
  const rxCol = cols.findIndex((c) => c.label === "rx");
  const cost = (c: number) => <rect x={x(c) - COLW / 2} y={TOP - 4} width={COLW} height={n * ROW + 8} fill="var(--carbon-soft)" opacity={0.45} />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`The 8-qubit QAOA circuit: Hadamards, a cost layer of ${gates.filter((g) => ["rz", "zz", "zzzz"].includes(g.kind)).length} rotation terms with gamma ${gamma.toFixed(3)}, a mixer of X rotations with beta ${beta.toFixed(3)}, then measurement.`}>
      {/* layer bands and labels */}
      {cols.map((c, i) => (c.label === "rz" || c.label === "zz" || c.label === "zzzz" ? <g key={`b${i}`}>{cost(i)}</g> : null))}
      <rect x={x(rxCol) - COLW / 2} y={TOP - 4} width={COLW} height={n * ROW + 8} fill="var(--water-soft)" opacity={0.7} />
      <text x={x(0)} y={TOP - 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold">START</text>
      <text x={(x(costStart) + x(costEnd)) / 2} y={TOP - 14} textAnchor="middle" className="fill-emerald-700 text-[11px] font-semibold">
        Cost layer · γ = {gamma.toFixed(3)}
      </text>
      <text x={x(rxCol)} y={TOP - 14} textAnchor="middle" className="fill-blue-700 text-[11px] font-semibold">Mix · β = {beta.toFixed(2)}</text>

      {/* wires and labels */}
      {Array.from({ length: n }, (_, q) => {
        const m = meaning.find((mm) => mm.qubit === q)!;
        return (
          <g key={q}>
            <line x1={LEFT - 8} x2={W - RIGHT} y1={y(q)} y2={y(q)} stroke="#cbd5e1" />
            <text x={LEFT - 14} y={y(q) + 4} textAnchor="end" className="fill-foreground text-[11px]">
              {m.bit === "where" ? "" : ""}
              <tspan className="font-semibold">{m.bit === "when" ? m.job.replace("model ", "") : ""}</tspan>
              <tspan dx={m.bit === "when" ? 6 : 0} className="fill-muted-foreground">{m.bit}</tspan>
            </text>
          </g>
        );
      })}

      {/* gates, lit up one column at a time */}
      {cols.map((c, i) => (
        <motion.g key={`c${i}`} initial={{ opacity: reduced ? 1 : 0.1 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : i * STEP, duration: 0.25 }}>
        {c.gates.map((g, k) => {
          const cx = x(i);
          if (g.kind === "h" || g.kind === "rx")
            return g.qubits.map((q) => (
              <g key={`${i}-${k}-${q}`}>
                <rect x={cx - 11} y={y(q) - 11} width={22} height={22} rx={4} fill="white" stroke={g.kind === "h" ? "var(--foreground)" : "var(--water)"} strokeWidth={1.5} />
                <text x={cx} y={y(q) + 4} textAnchor="middle" className={`text-[10px] font-bold ${g.kind === "h" ? "fill-foreground" : "fill-blue-700"}`}>{g.kind === "h" ? "H" : "Rx"}</text>
              </g>
            ));
          if (g.kind === "measure")
            return g.qubits.map((q) => (
              <g key={`${i}-${k}-${q}`}>
                <rect x={cx - 11} y={y(q) - 11} width={22} height={22} rx={4} fill="var(--foreground)" />
                <path d={`M${cx - 6} ${y(q) + 4} A7 7 0 0 1 ${cx + 6} ${y(q) + 4}`} fill="none" stroke="white" strokeWidth={1.4} />
                <line x1={cx} y1={y(q) + 4} x2={cx + 5} y2={y(q) - 5} stroke="white" strokeWidth={1.4} />
              </g>
            ));
          if (g.kind === "rz")
            return (
              <g key={`${i}-${k}`}>
                <rect x={cx - 11} y={y(g.qubits[0]) - 10} width={22} height={20} rx={4} fill="white" stroke="var(--carbon)" strokeWidth={1.5} />
                <text x={cx} y={y(g.qubits[0]) + 4} textAnchor="middle" className="fill-emerald-700 text-[9px] font-bold">Rz</text>
              </g>
            );
          const lo = Math.min(...g.qubits), hi = Math.max(...g.qubits);
          const color = g.kind === "zz" ? "var(--carbon)" : "#065f46";
          return (
            <g key={`${i}-${k}`}>
              <line x1={cx} x2={cx} y1={y(lo)} y2={y(hi)} stroke={color} strokeWidth={g.kind === "zz" ? 2 : 3} />
              {g.qubits.map((q) => (
                <circle key={q} cx={cx} cy={y(q)} r={g.kind === "zz" ? 4.5 : 5.5} fill={color} />
              ))}
            </g>
          );
        })}
        </motion.g>
      ))}
    </svg>
  );
}

/* --------------------------------------------------------------- histogram */

/**
 * Share of shots per tenth of all schedules, cheapest first. On first show the
 * series fill in one after another (random, simulator, IBM) and the best tenth
 * pulses once; later changes (another setting) just morph.
 */
export function Histogram({ data, delay = 0 }: { data: UiData; delay?: number }) {
  const { proof } = useApp();
  const raw = proof.hardware.find((h) => h.mitigation === "none")!;
  const reduced = prefersReducedMotion();
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  const d0 = reduced || !first.current ? 0 : delay;
  const series = [
    { key: "random", label: "Random guessing", v: proof.random.deciles, cls: "border-2 border-dashed border-foreground/40 bg-transparent" },
    { key: "ideal", label: "Perfect simulator", v: proof.ideal?.deciles ?? [], cls: "bg-carbon/45" },
    { key: "hw", label: `IBM ${raw.backend}`, v: raw.deciles, cls: "bg-foreground" },
  ];
  const MAX = 0.4;
  return (
    <figure className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-end gap-2" role="img" aria-label={`Share of shots in each tenth of the ${data.instance.n_schedules} schedules, cheapest first. Best tenth: random 10%, simulator ${pct(proof.ideal?.share_best10 ?? 0, 1)}, IBM hardware ${pct(raw.share_best10, 1)}.`}>
        {Array.from({ length: 10 }, (_, d) => (
          <motion.div
            key={d}
            className={`relative flex h-full flex-1 items-end gap-1 rounded-xl px-1.5 pt-8 pb-0 ${d === 0 ? "bg-carbon-soft/70" : ""}`}
            animate={d === 0 && !reduced && d0 > 0 ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ delay: d0 + 2.0, duration: 0.6 }}
          >
            {d === 0 && (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[12px] font-semibold whitespace-nowrap text-emerald-800">best 10%</span>
            )}
            {series.map((s, si) => (
              <motion.span
                key={s.key}
                className={`flex-1 rounded-t-md ${s.cls}`}
                initial={{ height: d0 > 0 ? "0%" : `${((s.v[d] ?? 0) / MAX) * 100}%` }}
                animate={{ height: `${((s.v[d] ?? 0) / MAX) * 100}%` }}
                transition={{ type: "spring", visualDuration: 0.5, bounce: 0, delay: d0 > 0 ? d0 + si * 0.65 + d * 0.03 : 0 }}
              />
            ))}
          </motion.div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-muted-foreground">
        <span>cheapest schedules</span>
        <span>most expensive</span>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-5 rounded-sm ${s.cls}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}


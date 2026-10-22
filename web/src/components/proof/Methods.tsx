import { Check, Cpu, FlaskConical, Scale, Shuffle, Sigma, TrendingDown, Users } from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { n0, prefersReducedMotion, priorityLabel } from "@/format";
import type { MethodRow } from "@/types";

const ICON: Record<string, typeof Check> = {
  "Business as usual": Users,
  "Run now": Users,
  Greedy: TrendingDown,
  "Simulated annealing": FlaskConical,
  "Random sampling (4,000)": Shuffle,
  "QAOA, simulator": Sigma,
  "True best (brute force)": Scale,
};

const KIND_LABEL: Record<MethodRow["kind"], string> = {
  baseline: "baseline",
  classical: "classical",
  "quantum-sim": "quantum · simulator",
  "quantum-hw": "quantum · real IBM hardware",
  referee: "referee",
};

function runtime(r: MethodRow) {
  if (r.runtime_ms == null) return "—";
  if (r.kind === "quantum-hw") return `${(r.runtime_ms / 1000).toFixed(0)} s QPU`;
  if (r.runtime_ms < 1) return `${r.runtime_ms.toFixed(2)} ms`;
  if (r.runtime_ms < 1000) return `${r.runtime_ms.toFixed(0)} ms`;
  return `${(r.runtime_ms / 1000).toFixed(1)} s`;
}

/** Feature 1: every method on the same objective, with gap to the true best and runtime. */
export function MethodsPanel() {
  const { data, proof } = useApp();
  if (!data.methods) return null;
  const entry = data.methods.weights.find((x) => x.w === proof.w) ?? data.methods.weights[1];
  const rows = entry.rows;
  const maxGap = Math.max(...rows.map((r) => r.gap_pct), 1);
  const solvers = rows.filter((r) => r.kind !== "baseline");
  const allOptimal = solvers.every((r) => r.gap_pct === 0);
  const reduced = prefersReducedMotion();
  return (
    <div className="flex h-full flex-col">
      <table className="w-full text-left text-[17px]">
        <thead>
          <tr className="text-[13px] text-muted-foreground">
            <th className="px-5 py-3 font-medium">Method · {priorityLabel(entry.w)}</th>
            <th className="px-3 py-3 font-medium">Gap to the true best</th>
            <th className="px-3 py-3 text-right font-medium">CO₂</th>
            <th className="px-3 py-3 text-right font-medium">Water</th>
            <th className="px-5 py-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const Icon = r.kind === "quantum-hw" ? Cpu : ICON[r.method] ?? Sigma;
            const hw = r.kind === "quantum-hw";
            return (
              <tr key={r.method} className={`border-t border-border ${hw ? "bg-foreground/[0.03]" : ""}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${hw ? "bg-foreground text-white" : r.kind === "quantum-sim" ? "bg-carbon-soft text-emerald-800" : "bg-muted text-foreground"}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{r.method === "Business as usual" ? "Run now (business as usual)" : r.method}</p>
                      <p className="text-[13px] text-muted-foreground" title={r.note}>{KIND_LABEL[r.kind]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  {r.gap_pct === 0 ? (
                    <motion.span initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduced ? 0 : 0.15 + i * 0.07 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-carbon-soft px-2.5 py-1 text-[13px] font-semibold text-emerald-800">
                      <Check className="size-3.5" aria-hidden="true" /> reaches the true best
                    </motion.span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-44 rounded-full bg-muted">
                        <motion.span className="block h-full rounded-full bg-rose-400" initial={{ width: reduced ? `${(r.gap_pct / maxGap) * 100}%` : 0 }} animate={{ width: `${(r.gap_pct / maxGap) * 100}%` }} transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }} />
                      </span>
                      <span className="font-semibold tabular-nums">+{r.gap_pct.toFixed(1)}%</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-4 text-right whitespace-nowrap tabular-nums">{n0(r.kg_co2)} kg</td>
                <td className="px-3 py-4 text-right whitespace-nowrap tabular-nums">{n0(r.litres)} L</td>
                <td className="px-5 py-4 text-right font-medium whitespace-nowrap tabular-nums">{runtime(r)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-auto border-t border-border bg-muted/50 px-5 py-4 text-[17px] font-medium">
        {allOptimal ? "At 4 jobs every method finds the best, and classical is faster. We show that on purpose." : "Gaps are against the exhaustive optimum on the same objective."}
      </p>
    </div>
  );
}

import { Check, Cpu, FlaskConical, Scale, Shuffle, Sigma, TrendingDown, Users } from "lucide-react";
import { useApp } from "@/lib/data";
import { n0, priorityLabel } from "@/format";
import type { MethodRow } from "@/types";

const ICON: Record<string, typeof Check> = {
  "Business as usual": Users,
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
export function MethodsCompared() {
  const { data, proof } = useApp();
  if (!data.methods) return null;
  const entry = data.methods.weights.find((x) => x.w === proof.w) ?? data.methods.weights[1];
  const rows = entry.rows;
  const maxGap = Math.max(...rows.map((r) => r.gap_pct), 1);
  const solvers = rows.filter((r) => r.kind !== "baseline");
  const allOptimal = solvers.every((r) => r.gap_pct === 0);
  return (
    <section id="methods" className="scroll-mt-24 px-4 pb-24">
      <div className="mx-auto max-w-[1150px]">
        <div className="mx-auto max-w-[960px] text-center">
          <h2 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
            Is it better than simple methods?
            <span className="block text-foreground/45">{allOptimal ? "Not at this size. Here is the fair comparison." : "Here is the fair comparison."}</span>
          </h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-3xl bg-white ring-1 ring-border">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-6 py-4">
            <p className="text-[15px] font-semibold">Same objective, same {data.methods.instance} · {priorityLabel(entry.w)} setting</p>
            <p className="text-[12px] text-muted-foreground">Runtimes: {data.methods.runtimes}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead>
                <tr className="text-[12px] text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-3 py-3 font-medium">Gap to the true best</th>
                  <th className="px-3 py-3 text-right font-medium">CO₂</th>
                  <th className="px-3 py-3 text-right font-medium">Water</th>
                  <th className="px-6 py-3 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const Icon = r.kind === "quantum-hw" ? Cpu : ICON[r.method] ?? Sigma;
                  const hw = r.kind === "quantum-hw";
                  return (
                    <tr key={r.method} className={`border-t border-border ${hw ? "bg-foreground/[0.03]" : ""}`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${hw ? "bg-foreground text-white" : r.kind === "quantum-sim" ? "bg-carbon-soft text-emerald-800" : "bg-muted text-foreground"}`}>
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold">{r.method}</p>
                            <p className="max-w-[560px] truncate text-[12px] text-muted-foreground" title={r.note}>{KIND_LABEL[r.kind]} · {r.note}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.gap_pct === 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-carbon-soft px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
                            <Check className="size-3.5" aria-hidden="true" /> reaches the true best
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-40 rounded-full bg-muted">
                              <span className="block h-full rounded-full bg-rose-400" style={{ width: `${(r.gap_pct / maxGap) * 100}%` }} />
                            </span>
                            <span className="font-semibold tabular-nums">+{r.gap_pct.toFixed(1)}%</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{n0(r.kg_co2)} kg</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{n0(r.litres)} L</td>
                      <td className="px-6 py-3 text-right font-medium whitespace-nowrap tabular-nums">{runtime(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border bg-muted/50 px-6 py-4 text-[14px] leading-relaxed text-muted-foreground">
            {allOptimal ? (
              <>
                <b className="text-foreground">Every method reaches the true best on this 4-job instance, and the classical ones are much faster.</b> Even 4,000 random guesses find it. So we don&rsquo;t claim the quantum computer wins here. Our claim is a correct quantum formulation, run end to end on real hardware, as a path to larger problems.
              </>
            ) : (
              <>Gaps are measured against the brute-force optimum on the same objective. Our claim is a correct quantum formulation run on real hardware, not an advantage.</>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

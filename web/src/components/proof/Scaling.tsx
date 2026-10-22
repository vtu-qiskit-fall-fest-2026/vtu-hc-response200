import { useApp } from "@/lib/data";
import { n0 } from "@/format";
import type { ScalingRow } from "@/types";

type Series = { key: string; label: string; color: string; dash?: string; pts: { x: number; y: number }[] };

/** Small line chart: x = qubits, several series. Only measured points are drawn. */
function Chart({ series, yMin, yMax, yFmt, xs, title, mark }: {
  series: Series[]; yMin: number; yMax: number; yFmt: (v: number) => string; xs: number[]; title: string;
  mark?: { x: number; y: number; label: string };
}) {
  const W = 520, H = 250, L = 48, B = 34, T = 12, R = 14;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const sx = (x: number) => L + ((x - x0) / Math.max(x1 - x0, 1)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B);
  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  return (
    <figure className="rounded-3xl bg-white p-5 ring-1 ring-border">
      <figcaption className="text-[15px] font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${title}. ${series.map((s) => `${s.label}: ${s.pts.map((p) => `${p.x} qubits ${yFmt(p.y)}`).join(", ")}`).join(". ")}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={L - 6} y={sy(t) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{yFmt(t)}</text>
          </g>
        ))}
        {xs.map((x) => (
          <text key={x} x={sx(x)} y={H - 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">{x}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="fill-muted-foreground text-[10px]">qubits</text>
        {series.map((s) => (
          <g key={s.key}>
            <path d={s.pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2.4} strokeDasharray={s.dash} />
            {s.pts.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3.4} fill={s.color} />)}
          </g>
        ))}
        {mark && (
          <g>
            <circle cx={sx(mark.x)} cy={sy(mark.y)} r={8} fill="none" stroke="var(--foreground)" strokeWidth={1.6} />
            <text x={sx(mark.x) + 12} y={sy(mark.y) - 8} className="fill-foreground text-[10px] font-semibold">{mark.label}</text>
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="2.4" strokeDasharray={s.dash} /></svg>
            {s.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Feature 3: measured scaling from results/scaling.json; nothing extrapolated. */
export function HowItScales() {
  const { data } = useApp();
  const sc = data.scaling;
  if (!sc || sc.sizes.length === 0) return null;
  const rows = sc.sizes;
  const xs = rows.map((r) => r.qubits);
  const noisy = rows.filter((r) => r.qaoa_noisy);
  const hwRow = rows.find((r) => r.qubits === data.circuit.n_qubits);
  const lastNoisy = noisy[noisy.length - 1];
  const largest = rows[rows.length - 1];
  const keepShare = (r: ScalingRow) =>
    r.qaoa_noisy ? (r.qaoa_noisy.share_best10 - r.random.share_best10) / (r.qaoa_ideal.share_best10 - r.random.share_best10) : null;
  const realHw = data.proof.find((p) => p.w === sc.weight)?.hardware.find((h) => h.mitigation === "none");
  const greedyMiss = rows.filter((r) => r.classical.greedy.gap_pct > 0);
  return (
    <section id="scaling" className="scroll-mt-24 px-4 pb-24">
      <div className="mx-auto max-w-[1150px]">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
            How it scales.
            <span className="block text-foreground/45">Measured from {rows[0].jobs} to {largest.jobs} jobs.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Chart
            title="Shots landing in the best 10% of schedules"
            xs={xs}
            yMin={0}
            yMax={0.5}
            yFmt={(v) => `${Math.round(v * 100)}%`}
            series={[
              { key: "ideal", label: "QAOA, perfect simulator", color: "var(--carbon)", pts: rows.map((r) => ({ x: r.qubits, y: r.qaoa_ideal.share_best10 })) },
              { key: "noisy", label: `QAOA, noisy ${sc.backend_layout.replace("fake_", "")} model`, color: "var(--foreground)", dash: "5 3", pts: noisy.map((r) => ({ x: r.qubits, y: r.qaoa_noisy!.share_best10 })) },
              { key: "random", label: "random guessing", color: "#94a3b8", dash: "2 3", pts: rows.map((r) => ({ x: r.qubits, y: r.random.share_best10 })) },
            ]}
            mark={realHw ? { x: data.circuit.n_qubits, y: realHw.share_best10, label: `real ibm_marrakesh: ${Math.round(realHw.share_best10 * 100)}%` } : undefined}
          />
          <Chart
            title={`Circuit size after compiling for ${sc.backend_layout.replace("fake_", "")} (two-qubit gates)`}
            xs={xs}
            yMin={0}
            yMax={Math.ceil(Math.max(...rows.map((r) => r.two_qubit_gates)) / 100) * 100}
            yFmt={(v) => n0(v)}
            series={[{ key: "gates", label: "two-qubit gates, one QAOA layer", color: "var(--water)", pts: rows.map((r) => ({ x: r.qubits, y: r.two_qubit_gates })) }]}
            mark={hwRow ? { x: hwRow.qubits, y: hwRow.two_qubit_gates, label: `ran on real hardware (${hwRow.two_qubit_gates})` } : undefined}
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-3xl bg-white ring-1 ring-border">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead>
              <tr className="text-[12px] text-muted-foreground">
                {["Jobs", "Qubits", "Schedules", "2-qubit gates", "Best-10% ideal", "Best-10% noisy", "Random", "Greedy gap", "Annealing gap", "Exhaustive search"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.jobs} className={`border-t border-border tabular-nums ${r.qubits === data.circuit.n_qubits ? "bg-foreground/[0.03]" : ""}`}>
                  <td className="px-4 py-2.5 font-semibold">{r.jobs}</td>
                  <td className="px-4 py-2.5">{r.qubits}</td>
                  <td className="px-4 py-2.5">{n0(r.schedules)}</td>
                  <td className="px-4 py-2.5">{n0(r.two_qubit_gates)}</td>
                  <td className="px-4 py-2.5">{(r.qaoa_ideal.share_best10 * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2.5">{r.qaoa_noisy ? `${(r.qaoa_noisy.share_best10 * 100).toFixed(1)}%` : <span className="text-muted-foreground">not run</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(r.random.share_best10 * 100).toFixed(0)}%</td>
                  <td className="px-4 py-2.5">{r.classical.greedy.gap_pct === 0 ? "0%" : `+${r.classical.greedy.gap_pct.toFixed(1)}%`}</td>
                  <td className="px-4 py-2.5">{r.classical.annealing.gap_pct === 0 ? "0%" : `+${r.classical.annealing.gap_pct.toFixed(1)}%`}</td>
                  <td className="px-4 py-2.5">{r.exhaustive_ms < 1 ? "<1 ms" : `${n0(r.exhaustive_ms)} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-2 border-t border-border bg-muted/50 px-6 py-4 text-[14px] leading-relaxed text-muted-foreground">
            <p>
              <b className="text-foreground">Where it stops fitting today&rsquo;s hardware.</b> One QAOA layer needs{" "}
              {hwRow ? n0(hwRow.two_qubit_gates) : "–"} two-qubit gates at {data.circuit.n_qubits} qubits and {n0(largest.two_qubit_gates)} at {largest.qubits} qubits, because every pair of jobs adds gates.{" "}
              {lastNoisy && keepShare(lastNoisy) !== null && (
                <>
                  On the noisy model of the device the circuit keeps {Math.round(100 * keepShare(rows[0])!)}% of its ideal gain over random at {rows[0].qubits} qubits and {Math.round(100 * keepShare(lastNoisy)!)}% at {lastNoisy.qubits} qubits.{" "}
                </>
              )}
              {realHw && hwRow?.qaoa_noisy && (
                <>The noise model is optimistic: at {data.circuit.n_qubits} qubits it predicted {Math.round(hwRow.qaoa_noisy.share_best10 * 100)}% of shots in the best tenth, and the real ibm_marrakesh gave {Math.round(realHw.share_best10 * 100)}%. </>
              )}
              Sizes above {lastNoisy?.qubits ?? "–"} qubits were not simulated with noise, and we don&rsquo;t extrapolate.
            </p>
            <p>
              <b className="text-foreground">Classical methods keep up at these sizes.</b> Exhaustive search over {n0(largest.schedules)} schedules took {n0(largest.exhaustive_ms)} ms
              {greedyMiss.length > 0 ? `; greedy missed the optimum at ${greedyMiss.map((r) => r.jobs).join(", ")} jobs, while annealing ${rows.every((r) => r.classical.annealing.gap_pct === 0) ? "always found it" : "sometimes missed it too"}` : "; greedy and annealing found the optimum at every size"}. {sc.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { n0, prefersReducedMotion } from "@/format";

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
    <figure className="flex min-h-0 flex-col rounded-3xl bg-muted/50 p-5">
      <figcaption className="text-[16px] font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 min-h-0 w-full flex-1" role="img" aria-label={`${title}. ${series.map((s) => `${s.label}: ${s.pts.map((p) => `${p.x} qubits ${yFmt(p.y)}`).join(", ")}`).join(". ")}`}>
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
            <motion.path d={s.pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2.4} strokeDasharray={s.dash}
              initial={{ pathLength: prefersReducedMotion() ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} />
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
export function ScalingPanel() {
  const { data } = useApp();
  const sc = data.scaling;
  if (!sc || sc.sizes.length === 0) return null;
  const rows = sc.sizes;
  const xs = rows.map((r) => r.qubits);
  const noisy = rows.filter((r) => r.qaoa_noisy);
  const hwRow = rows.find((r) => r.qubits === data.circuit.n_qubits);
  const largest = rows[rows.length - 1];
  const realHw = data.proof.find((p) => p.w === sc.weight)?.hardware.find((h) => h.mitigation === "none");
  const layout = sc.backend_layout.replace("fake_", "");
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <Chart
          title="Shots in the best 10% of schedules"
          xs={xs}
          yMin={0}
          yMax={0.5}
          yFmt={(v) => `${Math.round(v * 100)}%`}
          series={[
            { key: "ideal", label: "perfect simulator", color: "var(--carbon)", pts: rows.map((r) => ({ x: r.qubits, y: r.qaoa_ideal.share_best10 })) },
            { key: "noisy", label: `noisy ${layout} model`, color: "var(--foreground)", dash: "5 3", pts: noisy.map((r) => ({ x: r.qubits, y: r.qaoa_noisy!.share_best10 })) },
            { key: "random", label: "random guessing", color: "#94a3b8", dash: "2 3", pts: rows.map((r) => ({ x: r.qubits, y: r.random.share_best10 })) },
          ]}
          mark={realHw ? { x: data.circuit.n_qubits, y: realHw.share_best10, label: `real IBM: ${Math.round(realHw.share_best10 * 100)}%` } : undefined}
        />
        <Chart
          title="Two-qubit gates, one circuit layer"
          xs={xs}
          yMin={0}
          yMax={Math.ceil(Math.max(...rows.map((r) => r.two_qubit_gates)) / 100) * 100}
          yFmt={(v) => n0(v)}
          series={[{ key: "gates", label: `compiled for ${layout}`, color: "var(--water)", pts: rows.map((r) => ({ x: r.qubits, y: r.two_qubit_gates })) }]}
          mark={hwRow ? { x: hwRow.qubits, y: hwRow.two_qubit_gates, label: `ran on IBM (${hwRow.two_qubit_gates})` } : undefined}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 text-[15px]">
        <Stat big={`${hwRow ? n0(hwRow.two_qubit_gates) : "–"} → ${n0(largest.two_qubit_gates)}`} small={`gates from ${data.circuit.n_qubits} to ${largest.qubits} qubits`} />
        <Stat big={realHw && hwRow?.qaoa_noisy ? `${Math.round(hwRow.qaoa_noisy.share_best10 * 100)}% vs ${Math.round(realHw.share_best10 * 100)}%` : "–"} small="noise model vs real IBM: the model is optimistic" />
        <Stat big={`${n0(largest.exhaustive_ms)} ms`} small={`a laptop checks all ${n0(largest.schedules)} schedules`} />
      </div>
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3">
      <p className="text-[24px] leading-none font-semibold tracking-tight tabular-nums">{big}</p>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{small}</p>
    </div>
  );
}

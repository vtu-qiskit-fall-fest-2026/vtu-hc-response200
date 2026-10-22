import { useState } from "react";
import type { ProofEntry, RunSummary, SimResult, UiData } from "../types";
import { n0, pct, priorityLabel, signed } from "../format";

interface Props {
  data: UiData;
  w: number;
  onSelect: (w: number) => void;
}

type Row = { key: string; label: string; kind: "random" | "hw" | "sim"; share: number; sub: string };

function rowsFor(p: ProofEntry): Row[] {
  const rows: Row[] = [
    { key: "random", label: "Random guessing", kind: "random", share: p.random.share_best10, sub: "every schedule equally likely" },
  ];
  for (const h of p.hardware) {
    rows.push({
      key: h.job_id,
      label: `IBM hardware, ${h.mitigation === "none" ? "raw" : "error-mitigated"}`,
      kind: "hw",
      share: h.share_best10,
      sub: `${h.backend} · ${h.job_id}`,
    });
  }
  if (p.noisy) rows.push({ key: "noisy", label: "Noisy simulator", kind: "sim", share: p.noisy.share_best10, sub: `${p.noisy.backend} noise model` });
  if (p.ideal) rows.push({ key: "ideal", label: "Ideal simulator", kind: "sim", share: p.ideal.share_best10, sub: "no noise" });
  return rows;
}

const SCALE = 0.4; // bars run 0..40%

export function Proof({ data, w, onSelect }: Props) {
  const p = data.proof.find((x) => x.w === w) ?? data.proof[1];
  const allHw = data.proof.flatMap((x) => x.hardware);
  const shareMin = Math.min(...allHw.map((h) => h.share_best10));
  const shareMax = Math.max(...allHw.map((h) => h.share_best10));
  const zMin = Math.min(...allHw.map((h) => h.z_vs_random));
  const zMax = Math.max(...allHw.map((h) => h.z_vs_random));
  const mitigation = data.proof.map((x) => {
    const raw = x.hardware.find((h) => h.mitigation === "none")!;
    const mit = x.hardware.find((h) => h.mitigation === "dd_twirl")!;
    return { w: x.w, delta: mit.approx_ratio - raw.approx_ratio };
  });
  const keeps = data.proof.flatMap((x) =>
    x.ideal ? x.hardware.map((h) => (h.approx_ratio - x.random.approx_ratio) / (x.ideal!.approx_ratio - x.random.approx_ratio)) : [],
  );
  const raw = p.hardware.find((h) => h.mitigation === "none")!;

  return (
    <section className="section proof" id="proof" aria-labelledby="proof-title">
      <div className="section__head">
        <h2 id="proof-title">Is the quantum part real?</h2>
        <p className="lede">
          Each shot of the circuit reads out one complete schedule. Random guessing puts {pct(0.1)} of its shots in the
          best tenth of the {data.instance.n_schedules} schedules. On IBM&rsquo;s <span className="mono">{raw.backend}</span>, our
          circuit put <strong>{pct(shareMin)}–{pct(shareMax)}</strong> there.
        </p>
      </div>

      <div className="seg" role="tablist" aria-label="Priority setting run on hardware">
        {data.proof.map((x) => (
          <button key={x.w} role="tab" aria-selected={x.w === p.w} className={`seg__btn${x.w === p.w ? " is-on" : ""}`} onClick={() => onSelect(x.w)}>
            {priorityLabel(x.w)}
          </button>
        ))}
      </div>

      <div className="proof__grid">
        <div className="levels" aria-label="Share of shots in the best 10% of schedules">
          <h3>Shots landing in the best tenth of schedules</h3>
          <div className="levels__scale" aria-hidden="true">
            {[0, 0.1, 0.2, 0.3, 0.4].map((v) => (
              <span key={v} style={{ left: `${(v / SCALE) * 100}%` }}>{pct(v)}</span>
            ))}
          </div>
          {rowsFor(p).map((r) => (
            <div key={r.key} className={`level level--${r.kind}`}>
              <div className="level__label">
                <strong>{r.label}</strong>
                <span className={r.kind === "hw" ? "mono" : undefined}>{r.sub}</span>
              </div>
              <div className="level__bar">
                <span className="level__fill" style={{ width: `${(r.share / SCALE) * 100}%` }} />
                <span className="level__num" style={{ left: `${(r.share / SCALE) * 100}%` }}>{pct(r.share, 1)}</span>
              </div>
            </div>
          ))}
        </div>

        <Profile entry={p} />
      </div>

      <div className="ledger">
        <table>
          <caption>Hardware jobs at this setting, saved in <span className="mono">results/hardware/</span></caption>
          <thead>
            <tr>
              <th scope="col">Backend</th>
              <th scope="col">Job ID</th>
              <th scope="col">Error mitigation</th>
              <th scope="col" className="num">Approx. ratio</th>
              <th scope="col" className="num">vs random</th>
              <th scope="col" className="num">Shots on the optimum</th>
              <th scope="col" className="num">QPU time</th>
              <th scope="col">Completed (UTC)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="ledger__ref">
              <td colSpan={3}>Random guessing</td>
              <td className="num">{p.random.approx_ratio.toFixed(3)}</td>
              <td className="num">—</td>
              <td className="num">≈{n0(p.random.expected_optimum_hits)} / 4,000</td>
              <td className="num">—</td>
              <td />
            </tr>
            {p.hardware.map((h) => (
              <tr key={h.job_id}>
                <td className="mono">{h.backend}</td>
                <td className="mono">{h.job_id}</td>
                <td>{h.mitigation === "none" ? "none" : "dynamical decoupling + twirling"}</td>
                <td className="num">{h.approx_ratio.toFixed(3)} ± {h.approx_ratio_se.toFixed(3)}</td>
                <td className="num">+{h.z_vs_random.toFixed(1)} s.e.</td>
                <td className="num">{h.optimum_hits} / {n0(h.shots)}</td>
                <td className="num">{h.quantum_seconds ?? "—"} s</td>
                <td className="mono">{h.completed_utc?.replace("T", " ").replace("Z", "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ledger__total">
          All runs: {data.totals.hardware_jobs} jobs on {raw.backend} · {data.totals.quantum_seconds} s of quantum time ·{" "}
          {data.circuit.n_qubits} qubits · {raw.two_qubit_gates} two-qubit gates after transpiling · 4,000 shots each
        </p>
      </div>

      <ul className="honest">
        <li>
          <strong>Clearly better than random.</strong> All {allHw.length} hardware runs beat random guessing by {zMin.toFixed(0)}–{zMax.toFixed(0)} standard errors.
        </li>
        <li>
          <strong>Noise costs part of the gain.</strong> Hardware keeps {pct(Math.min(...keeps))}–{pct(Math.max(...keeps))} of the ideal
          simulator&rsquo;s improvement over random.
        </li>
        <li>
          <strong>Error mitigation gave no consistent benefit.</strong> Approximation ratio changed by{" "}
          {mitigation.map((m) => `${signed(m.delta)} (${priorityLabel(m.w).toLowerCase()})`).join(", ")}.
        </li>
        <li>
          <strong>Finding the optimum proves nothing at this size.</strong> Every run&rsquo;s cheapest shot was the true best schedule
          ({raw.optimum_hits} of 4,000 shots in the raw run here), but random guessing would also hit it about{" "}
          {n0(p.random.expected_optimum_hits)} times. The evidence is the shift of the whole distribution.
        </li>
      </ul>

      <SimulateButton w={p.w} />
    </section>
  );
}

function Profile({ entry }: { entry: ProofEntry }) {
  const raw = entry.hardware.find((h) => h.mitigation === "none")!;
  const series: { key: string; label: string; run: RunSummary | undefined; cls: string }[] = [
    { key: "hw", label: "IBM hardware, raw", run: raw, cls: "bar--hw" },
    { key: "ideal", label: "Ideal simulator", run: entry.ideal, cls: "bar--sim" },
  ];
  const max = 0.35;
  return (
    <div className="profile">
      <h3>Where all 4,000 shots landed</h3>
      <p className="profile__fast">Schedules ranked cheapest (left) to most expensive (right), in tenths.</p>
      <div className="profile__chart" role="img" aria-label="Share of shots per tenth of schedules for hardware and ideal simulator, against a flat 10% for random guessing">
        <span className="profile__random" style={{ bottom: `${(0.1 / max) * 100}%` }}>
          <span>random 10%</span>
        </span>
        {Array.from({ length: 10 }, (_, d) => (
          <div className="profile__col" key={d}>
            {series.map((s) => (
              <span key={s.key} className={`bar ${s.cls}`} style={{ height: `${((s.run?.deciles[d] ?? 0) / max) * 100}%` }} />
            ))}
          </div>
        ))}
      </div>
      <div className="profile__axis" aria-hidden="true">
        <span>cheapest tenth</span>
        <span>most expensive tenth</span>
      </div>
      <div className="profile__legend">
        <span><span className="swatch swatch--solid" /> IBM hardware, raw</span>
        <span><span className="swatch swatch--hatched" /> ideal simulator</span>
        <span><span className="swatch swatch--dash" /> random guessing</span>
      </div>
    </div>
  );
}

function SimulateButton({ w }: { w: number }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [res, setRes] = useState<SimResult | null>(null);
  const run = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w, shots: 4000 }) });
      if (!r.ok) throw new Error(String(r.status));
      setRes(await r.json());
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="simrun">
      <button className="btn btn--ghost" onClick={run} disabled={state === "busy"}>
        {state === "busy" ? "Running on the local simulator…" : "Re-run this setting on the local simulator"}
      </button>
      <span className="simrun__out" aria-live="polite">
        {state === "done" && res && (
          <>
            Simulator, fresh run: {pct(res.share_best10, 1)} of shots in the best tenth; optimum seen {res.optimum_hits} times;
            cheapest shot {res.found_optimum ? "is" : "is not"} the true best schedule.
          </>
        )}
        {state === "error" && <>The simulator isn&rsquo;t reachable from here. Everything on this page comes from saved results, so nothing else is affected.</>}
        {state === "idle" && <>Optional. Everything above is read from saved results.</>}
      </span>
    </div>
  );
}

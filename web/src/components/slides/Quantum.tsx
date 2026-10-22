import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { hardwareShareRange, mitigationDeltas, signed3, useApp } from "@/lib/data";
import { n0, pct, priorityLabel } from "@/format";
import { Circuit, Histogram, circuitLitAt } from "@/components/proof/Proof";
import { Badge, Card, Info, Screen, Segmented } from "./ui";

function Runs() {
  const { data, proof } = useApp();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (id: string) =>
    navigator.clipboard?.writeText(id).then(() => {
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1400);
    }).catch(() => undefined);
  const mixed = data.flex.presets.find((p) => p.qaoa?.hardware)?.qaoa?.hardware;
  const rows = [
    ...data.proof.flatMap((p) => p.hardware.map((h) => ({ id: h.job_id, label: `${priorityLabel(p.w)} · ${h.mitigation === "none" ? "raw" : "mitig."}`, active: p.w === proof.w }))),
    ...(mixed ? [{ id: mixed.job_id, label: "Balanced · rules · raw", active: false }] : []),
  ];
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {rows.map((r) => (
        <li key={r.id} className={`flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 ${r.active ? "bg-foreground/[0.07] ring-1 ring-foreground/15" : "bg-muted"}`}>
          <span className="min-w-0">
            <span className="block truncate font-mono text-[11.5px]">{r.id}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{r.label}</span>
          </span>
          <button onClick={() => copy(r.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-white hover:text-foreground" aria-label={`Copy job ID ${r.id}`}>
            {copied === r.id ? <Check className="size-3.5 text-carbon" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function QuantumScreen() {
  const { data, proof, setIdx } = useApp();
  const raw = proof.hardware.find((h) => h.mitigation === "none")!;
  const [lo, hi] = hardwareShareRange(data);
  const g = proof.qaoa!;
  const lit = circuitLitAt(proof.circuit_gates);
  return (
    <Screen
      title="Real circuit. Real IBM run."
      info={<>QAOA with one layer, run on IBM&rsquo;s {raw.backend} (Heron r2). A laptop still finds the best schedule faster: no advantage claimed.</>}
      right={
        <>
          <Segmented label="Hardware setting" value={proof.w} onChange={(w) => setIdx(data.sweep.findIndex((s) => s.w === w))}
            options={data.proof.map((p) => ({ value: p.w, label: priorityLabel(p.w) }))} />
          <Badge kind="real" />
        </>
      }
    >
      <div className="grid h-full grid-rows-[minmax(0,1.04fr)_minmax(0,1fr)] gap-5">
        <Card id="circuit" className="flex flex-col p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-1 text-[18px] font-semibold">
              {data.circuit.n_qubits} qubits: a <i className="not-italic text-carbon">where</i> and a <i className="not-italic text-indigo-600">when</i> per job
              <Info>Green: cost layer (γ = {g.gammas[0].toFixed(3)}), adds each schedule&rsquo;s carbon and water. Blue: mixer (β = {g.betas[0].toFixed(2)}), lets cheap schedules win.</Info>
            </h2>
            <div className="flex gap-2 text-[13px]">
              <span className="rounded-full bg-muted px-3 py-1">textbook encoding: {data.circuit.onehot_qubits} qubits</span>
              <span className="rounded-full bg-muted px-3 py-1">{raw.two_qubit_gates} two-qubit gates on {raw.backend}</span>
            </div>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            <Circuit data={data} gates={proof.circuit_gates} gamma={g.gammas[0]} beta={g.betas[0]} />
          </div>
        </Card>

        <div className="grid min-h-0 grid-cols-[1.35fr_1fr] gap-5">
          <Card id="histogram" className="flex flex-col p-5">
            <h2 className="flex items-center gap-1 text-[18px] font-semibold">
              Where {n0(raw.shots)} shots landed
              <Info>All {data.instance.n_schedules} schedules sorted by cost, in tenths. Random guessing puts 10% in each tenth.</Info>
            </h2>
            <div className="mt-3 min-h-0 flex-1"><Histogram data={data} delay={lit} /></div>
          </Card>
          <Card id="facts" className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-3 gap-3">
              <Fact big={`${pct(lo)}–${pct(hi)}`} small="IBM shots in best tenth" />
              <Fact big="10%" small="random guessing" muted />
              <Fact big={pct(proof.ideal?.share_best10 ?? 0)} small="perfect simulator" />
            </div>
            <p className="flex items-center gap-1 text-[14px] text-muted-foreground">
              Error mitigation: <b className="text-foreground">no consistent gain</b>
              <Info>Change in quality score with mitigation, per setting: {mitigationDeltas(data).map(signed3).join(", ")}.</Info>
            </p>
            <div className="min-h-0 flex-1">
              <p className="mb-2 text-[13px] font-semibold">{data.totals.hardware_jobs} saved runs · {data.totals.quantum_seconds} s of quantum time</p>
              <Runs />
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  );
}

function Fact({ big, small, muted = false }: { big: string; small: string; muted?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted/70 p-3">
      <p className={`text-[26px] leading-none font-semibold tracking-tight tabular-nums ${muted ? "text-muted-foreground" : ""}`}>{big}</p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{small}</p>
    </div>
  );
}

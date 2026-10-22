import { useMemo, useRef, useState } from "react";
import { AlertCircle, Calculator, Droplet, Leaf, Loader2, Play, Plus, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/data";
import { n0, pct, priorityLabel } from "@/format";

/* ------------------------------------------------------------------ live jobs */

interface JobIn { name: string; kwh: number; home_site: "evap" | "air"; submitted_slot: "day" | "night"; deadline: boolean; residency: boolean }
interface Place { site: "evap" | "air"; slot: "day" | "night" }
interface LiveResult {
  mode: string; sampling: string; qubits: number; schedules: number;
  naive: { schedule: Place[]; kg_co2: number; litres: number };
  best: { schedule: Place[]; kg_co2: number; litres: number; ms: number };
  qaoa: { schedule: Place[]; found_optimum: boolean; share_best10: number; share_best10_random: number; share_obeying_rules: number; ms: number };
}

const MAX_JOBS = 5;
const placeLabel = (p: Place) => `Site ${p.site === "evap" ? "A" : "B"}, ${p.slot}`;

function parseCsv(text: string): JobIn[] {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: JobIn[] = [];
  for (const row of rows) {
    const [name, kwh, home, slot, deadline, residency] = row.split(",").map((c) => c.trim());
    if (!name || name.toLowerCase() === "name") continue; // header
    const site = /^(b|air)/i.test(home ?? "") ? "air" : "evap";
    out.push({
      name: name.slice(0, 40), kwh: Number(kwh), home_site: site,
      submitted_slot: /^n/i.test(slot ?? "") ? "night" : "day",
      deadline: /^(1|y|true)/i.test(deadline ?? ""), residency: /^(1|y|true)/i.test(residency ?? ""),
    });
  }
  return out.slice(0, MAX_JOBS);
}

function YourJobs() {
  const { data } = useApp();
  const [jobs, setJobs] = useState<JobIn[]>(() =>
    data.instance.jobs.map((j) => ({ name: j.label, kwh: j.it_energy_kwh, home_site: j.home_site as "evap" | "air", submitted_slot: j.submitted_slot as "day" | "night", deadline: false, residency: false })),
  );
  const [w, setW] = useState(0.5);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<LiveResult | null>(null);
  const [message, setMessage] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const problems = useMemo(() => {
    const p: string[] = [];
    jobs.forEach((j, i) => {
      if (!j.name.trim()) p.push(`Job ${i + 1} needs a name.`);
      if (!(j.kwh >= 50 && j.kwh <= 5000)) p.push(`${j.name || `Job ${i + 1}`}: energy must be 50–5,000 kWh.`);
      if (j.deadline && j.submitted_slot === "night") p.push(`${j.name}: a day deadline can't arrive at night.`);
    });
    if (jobs.length === 0) p.push("Add at least one job.");
    return p;
  }, [jobs]);

  const set = (i: number, patch: Partial<JobIn>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  const run = async () => {
    setState("busy");
    setMessage("");
    try {
      const r = await fetch("/api/custom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs, w }) });
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        const detail = typeof body?.detail === "string" ? body.detail : "Some values are out of range.";
        throw new Error(detail);
      }
      setResult(body);
      setState("done");
    } catch (e) {
      setMessage(e instanceof TypeError ? "The GreenQ server isn't reachable. Start it with python -m server." : String((e as Error).message));
      setState("error");
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const parsed = parseCsv(await f.text());
    if (parsed.length === 0) {
      setMessage("No jobs found. Expected columns: name, kWh, home site (A/B), arrives (day/night), deadline (yes/no), stays local (yes/no).");
      setState("error");
      return;
    }
    setJobs(parsed);
    setState("idle");
  };

  const input = "w-full rounded-lg bg-muted px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="min-w-0 rounded-3xl bg-white p-6 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-tight">Try your own jobs</h3>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-200">Live simulator, not hardware</span>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">Up to {MAX_JOBS} jobs on the same two sites. Solved by checking every schedule and by the QAOA circuit on a simulator.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2 font-medium">Job</th><th className="pb-2 font-medium">kWh</th><th className="pb-2 font-medium">Home</th>
              <th className="pb-2 font-medium">Arrives</th><th className="pb-2 text-center font-medium">Day deadline</th><th className="pb-2 text-center font-medium">Stays local</th><th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j, i) => (
              <tr key={i}>
                <td className="py-1 pr-2"><input aria-label={`Job ${i + 1} name`} className={input} value={j.name} maxLength={40} onChange={(e) => set(i, { name: e.target.value })} /></td>
                <td className="w-24 py-1 pr-2"><input aria-label={`Job ${i + 1} energy in kWh`} className={input} type="number" min={50} max={5000} step={50} value={j.kwh} onChange={(e) => set(i, { kwh: Number(e.target.value) })} /></td>
                <td className="w-24 py-1 pr-2">
                  <select aria-label={`Job ${i + 1} home site`} className={input} value={j.home_site} onChange={(e) => set(i, { home_site: e.target.value as JobIn["home_site"] })}>
                    <option value="evap">Site A</option><option value="air">Site B</option>
                  </select>
                </td>
                <td className="w-24 py-1 pr-2">
                  <select aria-label={`Job ${i + 1} arrival slot`} className={input} value={j.submitted_slot} onChange={(e) => set(i, { submitted_slot: e.target.value as JobIn["submitted_slot"] })}>
                    <option value="day">Day</option><option value="night">Night</option>
                  </select>
                </td>
                <td className="py-1 text-center"><input aria-label={`Job ${i + 1} has a day deadline`} type="checkbox" className="size-4 accent-foreground" checked={j.deadline} onChange={(e) => set(i, { deadline: e.target.checked })} /></td>
                <td className="py-1 text-center"><input aria-label={`Job ${i + 1} must stay at its home site`} type="checkbox" className="size-4 accent-foreground" checked={j.residency} onChange={(e) => set(i, { residency: e.target.checked })} /></td>
                <td className="py-1 text-right">
                  <button aria-label={`Remove job ${i + 1}`} onClick={() => setJobs((js) => js.filter((_, k) => k !== i))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-4" aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={jobs.length >= MAX_JOBS} onClick={() => setJobs((js) => [...js, { name: `Job ${js.length + 1}`, kwh: 500, home_site: "evap", submitted_slot: "day", deadline: false, residency: false }])}
          className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-[13px] font-medium disabled:opacity-40"><Plus className="size-4" aria-hidden="true" /> Add job</button>
        <button onClick={() => file.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-[13px] font-medium"><Upload className="size-4" aria-hidden="true" /> Upload CSV</button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <select aria-label="Priority" className="rounded-xl bg-muted px-3 py-2 text-[13px] font-medium" value={w} onChange={(e) => setW(Number(e.target.value))}>
          {[0, 0.25, 0.5, 0.75, 1].map((x) => <option key={x} value={x}>{priorityLabel(x)}</option>)}
        </select>
        <button disabled={problems.length > 0 || state === "busy"} onClick={run}
          className="ml-auto flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-[14px] font-medium text-white disabled:opacity-40">
          {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} Find the best plan
        </button>
      </div>
      {problems.length > 0 && <p className="mt-2 text-[12px] text-rose-700">{problems[0]}</p>}

      <div aria-live="polite">
        {state === "error" && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[13px] text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {message}</p>
        )}
        {state === "done" && result && (
          <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <ul className="space-y-1.5 text-[13px]">
              {jobs.map((j, i) => {
                const a = result.naive.schedule[i], b = result.best.schedule[i];
                const moved = a.site !== b.site || a.slot !== b.slot;
                return (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/70 px-3 py-2">
                    <span className="font-semibold">{j.name}</span>
                    <span className="text-muted-foreground">{placeLabel(a)}</span>
                    <span aria-hidden="true">→</span>
                    <span className={moved ? "font-semibold" : "text-muted-foreground"}>{moved ? placeLabel(b) : "stays"}</span>
                  </li>
                );
              })}
            </ul>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-carbon-soft/60 p-3"><p className="flex items-center gap-1 text-[12px] font-semibold text-carbon"><Leaf className="size-3.5" aria-hidden="true" /> CO₂ saved</p>
                  <p className="mt-1 text-[22px] font-semibold text-emerald-800 tabular-nums">{n0(result.naive.kg_co2 - result.best.kg_co2)} kg</p></div>
                <div className="rounded-2xl bg-water-soft/60 p-3"><p className="flex items-center gap-1 text-[12px] font-semibold text-water"><Droplet className="size-3.5" aria-hidden="true" /> Water saved</p>
                  <p className="mt-1 text-[22px] font-semibold text-blue-800 tabular-nums">{n0(result.naive.litres - result.best.litres)} L</p></div>
              </div>
              <p className="rounded-xl bg-muted/70 p-3 text-[12px] text-muted-foreground">
                {result.qubits} qubits, {n0(result.schedules)} schedules. QAOA on the simulator {result.qaoa.found_optimum ? "found" : "missed"} the true best;{" "}
                {pct(result.qaoa.share_best10)} of shots in the best tenth (random {pct(result.qaoa.share_best10_random)})
                {result.qaoa.share_obeying_rules < 1 ? `; ${pct(result.qaoa.share_obeying_rules)} obeyed every rule` : ""}. {result.sampling}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ annual impact */

function AnnualImpact() {
  const { data } = useApp();
  const totalKwh = data.instance.jobs.reduce((a, j) => a + j.it_energy_kwh, 0);
  const kgPerKwh = data.naive.kg_co2 / totalKwh;
  const lPerKwh = data.naive.litres / totalKwh;
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  const co2Saving = mid.saved_kg_co2 / data.naive.kg_co2;
  const waterSaving = mid.saved_litres / data.naive.litres;
  const [gwh, setGwh] = useState(100);
  const [flex, setFlex] = useState(20);
  const kwh = gwh * 1e6 * (flex / 100);
  const tonnes = (kwh * kgPerKwh * co2Saving) / 1000;
  const megalitres = (kwh * lPerKwh * waterSaving) / 1e6;
  const input = "w-28 rounded-lg bg-muted px-2 py-1.5 text-[14px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="flex min-w-0 flex-col rounded-3xl bg-white p-6 ring-1 ring-border">
      <h3 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight"><Calculator className="size-5" aria-hidden="true" /> What could it be worth?</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">Scales our measured saving to a fleet you describe. Every input is an assumption, not data from a real deployment.</p>
      <div className="mt-4 space-y-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span><b className="text-[10px] tracking-wide text-amber-800 uppercase">Assumption</b><br />Fleet IT energy per year (GWh)</span>
          <input className={input} type="number" min={1} max={100000} value={gwh} onChange={(e) => setGwh(Math.max(0, Number(e.target.value)))} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span><b className="text-[10px] tracking-wide text-amber-800 uppercase">Assumption</b><br />Share of that load that is flexible (%)</span>
          <input className={input} type="number" min={0} max={100} value={flex} onChange={(e) => setFlex(Math.min(100, Math.max(0, Number(e.target.value))))} />
        </label>
        <p className="text-[12px] text-muted-foreground">
          <b className="text-[10px] tracking-wide text-amber-800 uppercase">Assumption</b> the flexible load behaves like our 4-job example: {kgPerKwh.toFixed(2)} kg CO₂ and {lPerKwh.toFixed(2)} L per kWh under business as usual, and GreenQ saves {pct(co2Saving, 1)} CO₂ and {pct(waterSaving, 1)} water (balanced, all flexible).
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-carbon-soft/60 p-4"><p className="flex items-center gap-1 text-[12px] font-semibold text-carbon"><Leaf className="size-3.5" aria-hidden="true" /> CO₂ per year</p>
          <p className="mt-1 text-[28px] leading-none font-semibold text-emerald-800 tabular-nums">{n0(tonnes)} t</p></div>
        <div className="rounded-2xl bg-water-soft/60 p-4"><p className="flex items-center gap-1 text-[12px] font-semibold text-water"><Droplet className="size-3.5" aria-hidden="true" /> Water per year</p>
          <p className="mt-1 text-[28px] leading-none font-semibold text-blue-800 tabular-nums">{megalitres.toFixed(1)} ML</p></div>
      </div>
      <p className="mt-4 rounded-xl bg-muted/70 p-3 font-mono text-[11px] leading-relaxed break-words text-muted-foreground">
        saved/yr = fleet GWh × 10⁶ × flexible share × (footprint per kWh, business as usual) × measured saving
        <br />CO₂: {gwh} × 10⁶ × {flex}% × {kgPerKwh.toFixed(3)} kg × {pct(co2Saving, 1)} = {n0(tonnes)} t
        <br />Water: {gwh} × 10⁶ × {flex}% × {lPerKwh.toFixed(3)} L × {pct(waterSaving, 1)} = {megalitres.toFixed(1)} ML
      </p>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground">Illustrative. Real fleets differ in sites, grids, cooling and how flexible their jobs are; fewer flexible jobs means less saving (see the planner&rsquo;s flexibility curve).</p>
    </div>
  );
}

export function TryIt() {
  return (
    <section id="try" className="scroll-mt-24 px-4 pb-24">
      <div className="mx-auto max-w-[1150px]">
        <h2 className="text-center text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
          Try it yourself.
          <span className="block text-foreground/45">Your jobs, and what it could be worth.</span>
        </h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <YourJobs />
          <AnnualImpact />
        </div>
      </div>
    </section>
  );
}

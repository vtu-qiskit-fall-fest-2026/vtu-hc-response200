import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowRight, Atom, Check, ChevronDown, CircleCheck, CodeXml, Cpu, Droplet, Leaf, Moon, Pause, Play, Sun } from "lucide-react";
import { hardwareShareRange, mitigationDeltas, signed3, useApp } from "@/lib/data";
import { n0, pct, prefersReducedMotion } from "@/format";
import { ChillerBuilding, CoolingTower, Illustrative, JobBlock } from "@/components/dashboard/Scene";

const REPO = "https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200";

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

export function PlayButton({ big = false }: { big?: boolean }) {
  const { playing, togglePlay } = useApp();
  return (
    <button
      data-story-control
      onClick={togglePlay}
      className={`flex items-center gap-2 rounded-2xl font-medium transition-colors ${big ? "bg-muted px-5 py-3 text-[15px] hover:bg-foreground/10" : "bg-foreground px-3.5 py-2 text-[14px] text-white hover:opacity-85"}`}
    >
      {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
      {playing ? "Pause story" : big ? "Play the 20-second story" : "Play story"}
    </button>
  );
}

export function Nav() {
  const links = [
    ["#dashboard", "Planner"],
    ["#cities", "Cities"],
    ["#proof", "Quantum proof"],
    ["#methods", "Vs. classical"],
    ["#scaling", "Scaling"],
    ["#try", "Try it"],
    ["#how", "How it works"],
    ["#faq", "Questions"],
  ];
  return (
    <header className="sticky top-3 z-50 px-4">
      <nav className="mx-auto flex max-w-[1150px] items-center justify-between gap-3 rounded-2xl border border-border bg-white/85 px-4 py-2.5 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.25)] backdrop-blur-md">
        <a href="#top" aria-label="GreenQ home"><Logo /></a>
        <div className="hidden items-center gap-7 text-[14px] text-muted-foreground lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">{label}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href={REPO} className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-[14px] text-muted-foreground hover:text-foreground sm:flex">
            <CodeXml className="size-4" aria-hidden="true" /> Code
          </a>
          <PlayButton />
        </div>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */

function MiniScene() {
  const { data } = useApp();
  const best = data.sweep.find((s) => s.w === 0.5)!.best.schedule;
  const [greenq, setGreenq] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setInterval(() => setGreenq((g) => !g), 2600);
    return () => window.clearInterval(t);
  }, []);
  const sched = greenq ? best : data.naive.schedule;
  const { sites, slots, options, jobs } = data.instance;
  return (
    <div className="mx-auto mt-12 w-full max-w-[760px] rounded-3xl bg-white p-4 text-left shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] ring-1 ring-border" aria-label="Animation: jobs move from business as usual to the GreenQ schedule">
      <div className="mb-3 flex items-center justify-between text-[13px]">
        <span className="font-semibold">{greenq ? "GreenQ schedule" : "Business as usual"}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${greenq ? "bg-carbon-soft text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
          {greenq ? "spread out, cleaner slots" : "Site A overloaded at night"}
        </span>
      </div>
      <LayoutGroup id="mini">
        <div className="grid grid-cols-2 gap-3">
          {sites.map((s) => (
            <div key={s.key} className="rounded-2xl bg-muted/70 p-2.5">
              <div className="mb-2 flex items-center gap-2">
                {s.cooling === "evaporative" ? <CoolingTower className="h-8 w-11" /> : <ChillerBuilding className="h-8 w-11" />}
                <span className="text-[12px] font-semibold">{s.label.split(" (")[0]}</span>
              </div>
              {slots.map((t) => {
                const k = options.find((o) => o.site === s.key && o.slot === t.key)!.index;
                const here = jobs.map((_, j) => j).filter((j) => sched[j] === k);
                return (
                  <div key={t.key} className={`mb-1.5 flex h-9 items-center gap-1 rounded-lg bg-white px-1.5 ring-1 last:mb-0 ${here.length > 1 ? "ring-rose-300" : "ring-border"}`}>
                    {t.key === "day" ? <Sun className="size-3 shrink-0 text-amber-500" aria-hidden="true" /> : <Moon className="size-3 shrink-0 text-indigo-500" aria-hidden="true" />}
                    {here.map((j) => <JobBlock key={jobs[j].key} data={data} j={j} moved={false} compact layoutPrefix="mini" />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

export function Hero() {
  const { data } = useApp();
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  return (
    <section id="top" className="px-4 pt-16 pb-12 text-center sm:pt-20">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-[1040px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-[13px] text-foreground">
          <Atom className="size-3.5 text-carbon" aria-hidden="true" /> Built with Qiskit · Run on a real IBM quantum computer
        </span>
        <h1 className="mt-6 text-[42px] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-[62px]">
          Same jobs, smarter placement.
          <span className="block text-foreground/45">Less carbon. Less water.</span>
        </h1>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="flex items-center gap-2 text-[22px] font-semibold text-carbon"><Leaf className="size-6" aria-hidden="true" /> −{n0(mid.saved_kg_co2)} kg CO₂</span>
          <span className="flex items-center gap-2 text-[22px] font-semibold text-water"><Droplet className="size-6" aria-hidden="true" /> −{n0(mid.saved_litres)} L water</span>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="#dashboard" className="flex items-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.6)] transition-transform hover:-translate-y-px">
            Open the planner <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <PlayButton big />
        </div>
        <MiniScene />
        <p className="mt-3 text-[12px] text-muted-foreground">Four illustrative jobs, two sites, day and night. Checked against all {data.instance.n_schedules} possible schedules.</p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ dashboard band */

export function DashboardBand({ children }: { children: ReactNode }) {
  return (
    <section id="dashboard" className="relative scroll-mt-20 px-4 pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 bottom-0 bg-[radial-gradient(60%_55%_at_15%_40%,rgba(16,185,129,0.18),transparent_70%),radial-gradient(60%_55%_at_85%_40%,rgba(37,99,235,0.16),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1150px]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ how it works */

function StepCard({ tint, label, title, text, children }: { tint: string; label: string; title: string; text: string; children: ReactNode }) {
  return (
    <div>
      <div className={`flex h-[240px] items-center justify-center rounded-3xl p-6 ${tint}`}>{children}</div>
      <p className="mt-5 text-[13px] font-medium text-muted-foreground">{label}</p>
      <h3 className="mt-1 text-[21px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

const MiniCard = ({ children }: { children: ReactNode }) => (
  <div className="w-full max-w-[290px] rounded-2xl bg-white p-4 text-left shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] ring-1 ring-border">{children}</div>
);

export function HowItWorks() {
  const { data } = useApp();
  const raw = data.proof[1].hardware.find((h) => h.mitigation === "none")!;
  const best = data.sweep[10].best;
  return (
    <section id="how" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-[1150px]">
        <h2 className="mx-auto max-w-[640px] text-center text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
          How it works.
          <span className="block text-foreground/45">Three steps.</span>
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          <StepCard tint="bg-emerald-50" label="1 · Encode" title={`${data.circuit.n_qubits} qubits, 2 per job`} text={`A where qubit and a when qubit for each job. Every reading is a valid schedule. The textbook method needs ${data.circuit.onehot_qubits} qubits.`}>
            <MiniCard>
              {data.instance.jobs.map((j, i) => {
                const k = best.schedule[i]; // bit 1 = where (site), bit 0 = when (slot)
                return (
                  <div key={j.key} className="flex items-center justify-between border-b border-border py-1.5 text-[12px] last:border-0">
                    <span className="font-medium">{j.label}</span>
                    <span className="flex gap-1">
                      <span className="rounded bg-muted px-1.5">Site {k >> 1 ? "B" : "A"}</span>
                      <span className="rounded bg-muted px-1.5">{k & 1 ? "Night" : "Day"}</span>
                    </span>
                  </div>
                );
              })}
            </MiniCard>
          </StepCard>
          <StepCard tint="bg-amber-50" label="2 · Run" title="QAOA on IBM hardware" text={`One circuit layer, ${raw.two_qubit_gates} two-qubit gates on ${raw.backend}. ${data.totals.hardware_jobs} runs, ${data.totals.quantum_seconds} s of quantum time.`}>
            <MiniCard>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 font-medium"><Cpu className="size-3.5" aria-hidden="true" /> {raw.backend}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Completed</span>
              </div>
              <div className="mt-3 flex h-20 items-end gap-1.5" aria-hidden="true">
                {raw.deciles.map((d, i) => (
                  <span key={i} className={`flex-1 rounded-t ${i === 0 ? "bg-carbon" : "bg-foreground/15"}`} style={{ height: `${(d / 0.25) * 100}%` }} />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Shots per tenth of schedules, cheapest on the left</p>
            </MiniCard>
          </StepCard>
          <StepCard tint="bg-blue-50" label="3 · Check" title="A laptop is the referee" text={`Every answer is graded against the true best of all ${data.instance.n_schedules} schedules. No quantum advantage is claimed.`}>
            <MiniCard>
              <div className="flex items-center gap-2 text-[13px] font-semibold"><CircleCheck className="size-4 text-carbon" aria-hidden="true" /> True best schedule found</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">CO₂</p><p className="font-semibold text-carbon">{n0(best.kg_co2)} kg</p></div>
                <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">Water</p><p className="font-semibold text-water">{n0(best.litres)} L</p></div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Checked {data.instance.n_schedules} / {data.instance.n_schedules} schedules</p>
            </MiniCard>
          </StepCard>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */

export function Faq() {
  const { data } = useApp();
  const [lo, hi] = hardwareShareRange(data);
  const d = mitigationDeltas(data).map(signed3).join(", ");
  const items: [string, string][] = [
    ["Is this faster than a normal computer?", `No. A laptop checks all ${data.instance.n_schedules} schedules instantly, and we use it as the referee. We claim no quantum advantage: only a working quantum method, tested on real hardware.`],
    ["What did the real quantum computer do?", `${data.totals.hardware_jobs} jobs on IBM's ${data.proof[0].hardware[0].backend} (${data.totals.quantum_seconds} s in total). It put ${pct(lo)}–${pct(hi)} of its shots in the best tenth of schedules; random guessing puts 10% there.`],
    ["What are you comparing against?", "“Business as usual”: every job runs at its home site the moment it arrives. That is what a scheduler does when it ignores carbon and water."],
    ["Are the numbers real?", "Grid carbon (0.710 kg/kWh, Govt. of India CEA) and power-plant water (2.6 L/kWh, NREL) are cited. Sites, jobs and the day/night split are illustrative."],
    ["Did error mitigation help?", `Not consistently. The quality score changed by ${d} across our three settings.`],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 bg-muted/60 px-4 py-24">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-center text-[36px] font-semibold tracking-[-0.03em] sm:text-[44px]">Honest answers</h2>
        <div className="mt-10 divide-y divide-border rounded-3xl bg-white ring-1 ring-border">
          {items.map(([q, a], i) => (
            <div key={q}>
              <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[16px] font-medium" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {q}
                <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

export function Footer() {
  const { data } = useApp();
  return (
    <footer className="px-4 py-14">
      <div className="mx-auto grid max-w-[1150px] gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">
            Team Response200 · VTU Qiskit Fall Fest 2026 · Track 6, Climate Change &amp; Sustainability. Built with Qiskit; not affiliated with IBM.
          </p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-muted-foreground">
            <li className="flex items-center gap-2"><Check className="size-4 text-carbon" aria-hidden="true" /> Cited: grid carbon and power-plant water</li>
            <li className="flex items-center gap-2"><Check className="size-4 text-carbon" aria-hidden="true" /> Real: {data.totals.hardware_jobs} IBM hardware runs, saved with job IDs</li>
            <li className="flex items-center gap-2"><Illustrative /> Sites, jobs and the day/night split</li>
          </ul>
        </div>
        <details className="group self-start rounded-2xl bg-muted/60 p-5 text-[13px]">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            Sources <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-4 break-words text-muted-foreground">
            {data.sources.references.map((r) => <li key={r}>{r}</li>)}
          </ol>
        </details>
      </div>
    </footer>
  );
}

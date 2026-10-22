import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Atom, Check, ChevronDown, CircleCheck, Cloud, CodeXml, Cpu, Droplets, ShieldCheck } from "lucide-react";
import type { UiData } from "@/types";
import { hardwareShareRange, mitigationDeltas } from "@/lib/data";
import { n0, pct } from "@/format";

const REPO = "https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200";

/* ------------------------------------------------------------------ brand */

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

export function Nav() {
  const links = [
    ["#dashboard", "Dashboard"],
    ["#how", "How it works"],
    ["#faq", "Questions"],
  ];
  return (
    <header className="sticky top-3 z-50 px-4">
      <nav className="mx-auto flex max-w-[1150px] items-center justify-between rounded-2xl border border-border bg-white/85 px-4 py-2.5 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.25)] backdrop-blur-md">
        <a href="#top" aria-label="GreenQ home"><Logo /></a>
        <div className="hidden items-center gap-7 text-[14px] text-muted-foreground md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">{label}</a>
          ))}
        </div>
        <a href={REPO} className="flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-85">
          <CodeXml className="size-4" aria-hidden="true" /> Code
        </a>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */

export function Hero({ data }: { data: UiData }) {
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  return (
    <section id="top" className="px-4 pt-20 pb-14 text-center sm:pt-24">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-[1040px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-[13px] text-foreground">
          <Atom className="size-3.5 text-carbon" aria-hidden="true" /> Built with Qiskit · Run on a real IBM quantum computer
        </span>
        <h1 className="mt-7 text-[44px] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-[64px]">
          Same jobs, smarter placement.
          <span className="block text-foreground/45">Less carbon. Less water.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-[17px] leading-relaxed text-muted-foreground">
          GreenQ chooses where and when data-centre jobs run, so the same work emits less CO₂ and uses less water.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#dashboard" className="flex items-center gap-2 rounded-2xl bg-carbon px-5 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(5,150,105,0.7)] transition-transform hover:-translate-y-px">
            See the result <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <a href="#how" className="rounded-2xl bg-muted px-5 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/10">How it works</a>
        </div>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-1.5"><Cloud className="size-4 text-carbon" aria-hidden="true" /> {n0(mid.saved_kg_co2)} kg CO₂ saved</li>
          <li className="flex items-center gap-1.5"><Droplets className="size-4 text-water" aria-hidden="true" /> {n0(mid.saved_litres)} L water saved</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="size-4" aria-hidden="true" /> Checked against all {data.instance.n_schedules} schedules</li>
        </ul>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ dashboard band */

export function DashboardBand({ children }: { children: ReactNode }) {
  return (
    <section id="dashboard" className="relative scroll-mt-24 px-4 pb-24">
      {/* soft carbon-to-water wash behind the app window */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 bottom-0 bg-[radial-gradient(60%_55%_at_15%_60%,rgba(16,185,129,0.22),transparent_70%),radial-gradient(60%_55%_at_85%_60%,rgba(37,99,235,0.2),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1150px]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ how it works */

function StepCard({ tint, label, title, text, children }: { tint: string; label: string; title: string; text: string; children: ReactNode }) {
  return (
    <div>
      <div className={`flex h-[250px] items-center justify-center rounded-3xl p-6 ${tint}`}>{children}</div>
      <p className="mt-5 text-[13px] font-medium text-muted-foreground">{label}</p>
      <h3 className="mt-1 text-[21px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

const MiniCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`w-full max-w-[290px] rounded-2xl bg-white p-4 text-left shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] ring-1 ring-border ${className}`}>{children}</div>
);

export function HowItWorks({ data }: { data: UiData }) {
  const raw = data.proof[1].hardware.find((h) => h.mitigation === "none")!;
  return (
    <section id="how" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-[1150px]">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
            From four jobs to a better schedule.
            <span className="block text-foreground/45">In three steps.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          <StepCard tint="bg-emerald-50" label="1 · Encode" title="Two qubits per job" text="One qubit picks the site, one picks the time. Every reading is a valid schedule.">
            <MiniCard>
              {data.instance.jobs.map((j, i) => {
                // option index k: bit 1 = where (site A/B), bit 0 = when (day/night)
                const k = data.sweep[10].best.schedule[i];
                return (
                  <div key={j.key} className="flex items-center justify-between border-b border-border py-1.5 text-[12px] last:border-0">
                    <span className="font-medium">{j.label}</span>
                    <span className="flex gap-1">
                      <span className="rounded bg-muted px-1.5 text-foreground">Site {k >> 1 ? "B" : "A"}</span>
                      <span className="rounded bg-muted px-1.5 text-foreground">{k & 1 ? "Night" : "Day"}</span>
                    </span>
                  </div>
                );
              })}
            </MiniCard>
          </StepCard>
          <StepCard tint="bg-amber-50" label="2 · Run" title="A quantum circuit picks" text={`QAOA, built in Qiskit, makes cheap schedules more likely. We ran it on IBM's ${raw.backend}.`}>
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
          <StepCard tint="bg-blue-50" label="3 · Check" title="A laptop is the referee" text={`Every answer is graded against the true best of all ${data.instance.n_schedules} schedules.`}>
            <MiniCard>
              <div className="flex items-center gap-2 text-[13px] font-semibold"><CircleCheck className="size-4 text-carbon" aria-hidden="true" /> Best schedule found</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">CO₂</p><p className="font-semibold text-carbon">{n0(data.sweep[10].best.kg_co2)} kg</p></div>
                <div className="rounded-xl bg-muted p-2.5"><p className="text-muted-foreground">Water</p><p className="font-semibold text-water">{n0(data.sweep[10].best.litres)} L</p></div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Checked: {data.instance.n_schedules} / {data.instance.n_schedules} schedules</p>
            </MiniCard>
          </StepCard>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */

export function Faq({ data }: { data: UiData }) {
  const [lo, hi] = hardwareShareRange(data);
  const d = mitigationDeltas(data).map((x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(3)}`).join(", ");
  const items: [string, string][] = [
    ["Is this faster than a normal computer?", `No. A laptop checks all ${data.instance.n_schedules} schedules instantly, and we use it as the referee. We claim no quantum advantage, only a working quantum method, tested on real hardware.`],
    ["What did the real quantum computer do?", `We ran ${data.totals.hardware_jobs} jobs on IBM's ${data.proof[0].hardware[0].backend} (${data.totals.quantum_seconds} s in total). It put ${pct(lo)}–${pct(hi)} of its shots in the best tenth of schedules. Random guessing puts 10% there.`],
    ["What are you comparing against?", "“Business as usual”: every job runs at its home site the moment it arrives. That’s what a scheduler does when it ignores carbon and water."],
    ["Are the numbers real?", "Grid carbon (0.710 kg/kWh, Govt. of India CEA) and power-plant water use (2.6 L/kWh, NREL) are cited. Site, job and day/night figures are illustrative examples."],
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

export function Footer({ data }: { data: UiData }) {
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
            <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" aria-hidden="true" /> Illustrative: sites, jobs and day/night split</li>
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

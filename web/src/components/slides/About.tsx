import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { prefersReducedMotion } from "@/format";
import { faqItems, steps } from "@/components/site/Site";
import { Badge, Card, Info, Screen } from "./ui";

export function AboutScreen() {
  const { data } = useApp();
  const reduced = prefersReducedMotion();
  return (
    <Screen
      title="How it works, honestly."
      right={<span className="text-[14px] text-muted-foreground">Team Response200 · Jagpreet Singh · Ramandeep Singh</span>}
    >
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-5">
        <div className="grid grid-cols-3 gap-5">
          {steps(data).map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.12, duration: 0.4 }}>
              <div className={`flex h-[150px] items-center justify-center overflow-hidden rounded-3xl p-4 ${s.tint}`}>{s.art}</div>
              <p className="mt-3 text-[13px] font-medium text-muted-foreground">{s.label}</p>
              <h2 className="text-[20px] font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">{s.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid min-h-0 grid-cols-[1.25fr_1fr] gap-5">
          <Card id="about" className="p-5">
            <h2 className="text-[18px] font-semibold">Honest answers</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
              {faqItems(data).map(([q, a]) => (
                <div key={q}>
                  <dt className="text-[15px] font-semibold">{q}</dt>
                  <dd className="mt-0.5 text-[14px] leading-snug text-muted-foreground">{a}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <div className="flex min-h-0 flex-col gap-5">
          <Card id="tech" className="p-5">
            <h2 className="text-[18px] font-semibold">Built with</h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-[14px]">
              {[
                ["Qiskit 2.6", "circuits, QAOA"],
                ["IBM Quantum", "ibm_marrakesh hardware"],
                ["Python", "model, solvers, tests"],
                ["FastAPI", "server"],
                ["React + Motion", "this app"],
                ["Groq", "explanations only"],
              ].map(([name, what]) => (
                <li key={name} className="rounded-full bg-muted px-3 py-1"><b className="font-semibold">{name}</b> <span className="text-muted-foreground">· {what}</span></li>
              ))}
            </ul>
          </Card>
          <Card id="sources" className="flex min-h-0 flex-1 flex-col p-5">
            <h2 className="flex items-center gap-1 text-[18px] font-semibold">
              Sources
              <Info>Full references and licences are in the README. Built with Qiskit; not affiliated with IBM.</Info>
            </h2>
            <ul className="mt-2 space-y-1.5">
              {data.sources.cited.map((c) => (
                <li key={c.figure} className="flex min-w-0 items-center gap-2 text-[13px]" title={c.source}>
                  <Badge kind="cited" />
                  <span className="truncate"><b className="font-semibold">{c.figure}</b> {c.value} <span className="text-muted-foreground">· {c.source.split(" (")[0]}</span></span>
                </li>
              ))}
              {data.cities && (
                <li className="flex min-w-0 items-center gap-2 text-[13px]">
                  <Badge kind="cited" />
                  <span className="truncate"><b className="font-semibold">State water stress</b> 0–5 <span className="text-muted-foreground">· WRI Aqueduct 4.0</span></span>
                </li>
              )}
              <li className="text-[13px] text-muted-foreground">Start animation and Dewy the mascot: drawn by Team Response200 (no photos, no logos). Mascot idea inspired by Saksham Gupta&rsquo;s guide <i>Make Your Own Mascot</i>.</li>
              <li className="flex min-w-0 items-start gap-2 text-[13px]">
                <Badge kind="illustrative" />
                <span className="line-clamp-2 text-muted-foreground">{data.sources.illustrative.map((x) => x.split(/ \(|,/)[0]).join(" · ")}</span>
              </li>
            </ul>
          </Card>
          </div>
        </div>
      </div>
    </Screen>
  );
}

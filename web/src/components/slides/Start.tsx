import { ArrowRight, Droplet, Leaf, Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "@/lib/data";
import { n0, prefersReducedMotion } from "@/format";
import { MiniScene } from "@/components/site/Site";
import { Badge, CountUp, Info } from "./ui";

export function StartScreen() {
  const { data, playing, togglePlay, go } = useApp();
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  const reduced = prefersReducedMotion();
  const rise = (d: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: reduced ? 0 : d, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <div className="grid h-full grid-cols-[1.05fr_1fr] items-center gap-14">
      <div>
        <motion.p {...rise(0)} className="flex flex-wrap items-center gap-2">
          <Badge kind="real" label={`${data.totals.hardware_jobs} real IBM runs`} />
          <Badge kind="cited" label="Cited grid data" />
          <Badge kind="illustrative" label="Illustrative jobs" />
        </motion.p>
        <motion.h1 {...rise(0.05)} className="mt-6 text-[76px] leading-[0.98] font-semibold tracking-[-0.045em]">
          Run smart:
          <span className="block text-foreground/45">less CO₂, less water.</span>
        </motion.h1>
        <motion.div {...rise(0.15)} className="mt-10 flex gap-10">
          <div>
            <p className="flex items-center text-[64px] leading-none font-semibold tracking-tight text-carbon tabular-nums">
              <Leaf className="mr-2 size-12" aria-hidden="true" />−<CountUp to={mid.saved_kg_co2} delay={0.3} duration={1.6} />
              <span className="ml-1 self-end pb-1.5 text-[24px] font-medium whitespace-nowrap text-emerald-800">kg CO₂</span>
            </p>
          </div>
          <div>
            <p className="flex items-center text-[64px] leading-none font-semibold tracking-tight text-water tabular-nums">
              <Droplet className="mr-2 size-12" aria-hidden="true" />−<CountUp to={mid.saved_litres} delay={0.45} duration={1.6} />
              <span className="ml-1 self-end pb-1.5 text-[24px] font-medium whitespace-nowrap text-blue-800">L water</span>
            </p>
          </div>
        </motion.div>
        <motion.p {...rise(0.25)} className="mt-4 flex items-center gap-1 text-[18px] text-muted-foreground">
          Four jobs, run smart instead of run now.
          <Info>Two sites, day or night. Checked against all {data.instance.n_schedules} possible schedules. Saved {n0(mid.saved_kg_co2)} kg and {n0(mid.saved_litres)} L at balanced priority.</Info>
        </motion.p>
        <motion.div {...rise(0.35)} className="mt-10 flex items-center gap-3">
          <button
            data-story-control
            onClick={togglePlay}
            className="flex items-center gap-2.5 rounded-2xl bg-foreground px-7 py-4 text-[19px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-px"
          >
            {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
            {playing ? "Pause" : "Play the story"}
          </button>
          <button onClick={() => go(1)} className="flex items-center gap-2 rounded-2xl px-5 py-4 text-[17px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Explore <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </motion.div>
      </div>
      <motion.div {...rise(0.2)}>
        <MiniScene />
      </motion.div>
    </div>
  );
}

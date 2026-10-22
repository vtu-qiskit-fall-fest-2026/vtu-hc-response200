import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Atom, CircleCheck, Droplet, Inbox, Leaf, Pause, Play, TrendingDown } from "lucide-react";
import { useApp } from "@/lib/data";
import { useCompact } from "@/lib/stage";
import { prefersReducedMotion } from "@/format";
import { MiniScene } from "@/components/site/Site";
import { Badge, CountUp } from "./ui";
import { SCENES } from "./StartScenes";

const SCENE_MS = 5500;
const STEPS = [
  { label: "Jobs arrive", Icon: Inbox },
  { label: "Quantum computer chooses", Icon: Atom },
  { label: "Footprint drops", Icon: TrendingDown },
];

/** Background slideshow: cross-fade + slow zoom; pauses on hover and in story mode. */
function useSlideshow(paused: boolean) {
  const reduced = prefersReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % SCENES.length), SCENE_MS);
    return () => window.clearTimeout(t);
  }, [i, paused, reduced]);
  return [i, setI] as const;
}

const glass = "rounded-3xl bg-white/85 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-white/70 backdrop-blur-md";

export function StartScreen() {
  const { data, playing, togglePlay, go } = useApp();
  const compact = useCompact();
  const [hover, setHover] = useState(false);
  const [scene, setScene] = useSlideshow(hover || playing);
  const reduced = prefersReducedMotion();
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  const step = SCENES[scene].step;
  const rise = (d: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: reduced ? 0 : d, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div className="relative h-full">
      {/* full-bleed background (covers the stage padding) */}
      <div
        className={`absolute overflow-hidden ${compact ? "-inset-4" : "-inset-x-10 -top-8 -bottom-7"}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={scene}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 1.2 }}
          >
            <motion.div
              className="h-full w-full"
              initial={{ scale: 1 }}
              animate={{ scale: reduced ? 1 : 1.05 }}
              transition={{ duration: (SCENE_MS + 1200) / 1000, ease: "linear" }}
            >
              {(() => { const V = SCENES[scene].View; return <V />; })()}
            </motion.div>
          </motion.div>
        </AnimatePresence>
        {/* readability overlay: strong on the left (text), lighter on the right (image) */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-white/25" />
      </div>

      {/* content: only the cards take pointer events, so hovering the image pauses it */}
      <div className={`pointer-events-none relative grid h-full gap-6 ${compact ? "grid-cols-1" : "grid-cols-[1.12fr_0.88fr] grid-rows-[minmax(0,1fr)_auto]"}`}>
        <motion.section {...rise(0)} className={`pointer-events-auto flex flex-col justify-center ${compact ? "gap-4 p-5" : "gap-6 p-9"} ${glass}`}>
          <div>
            <h1 className={`${compact ? "text-[36px]" : "text-[60px]"} leading-[1.02] font-semibold tracking-[-0.04em]`}>
              Same jobs.
              <span className="block text-foreground/60">Smarter place and time.</span>
            </h1>
            <p className={`mt-4 ${compact ? "text-[17px]" : "text-[22px]"} leading-snug text-foreground/80`}>Less carbon and less water, chosen with a real quantum computer.</p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <Saving tone="carbon" value={mid.saved_kg_co2} unit="kg CO₂ less" delay={0.35} small={compact} />
            <Saving tone="water" value={mid.saved_litres} unit="L water less" delay={0.5} small={compact} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              data-story-control
              onClick={togglePlay}
              className="flex items-center gap-2.5 rounded-2xl bg-foreground px-7 py-4 text-[19px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-px focus-visible:outline-offset-4"
            >
              {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
              {playing ? "Pause" : "Play the story"}
            </button>
            <button onClick={() => go(1)} className="flex items-center gap-2 rounded-2xl bg-white/70 px-5 py-4 text-[17px] font-medium text-foreground ring-1 ring-border hover:bg-white">
              Explore <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-[14px] font-medium">
            <span className="flex items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-white">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" /> Real IBM quantum runs: {data.totals.hardware_jobs}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-foreground ring-1 ring-border">
              <CircleCheck className="size-4 text-carbon" aria-hidden="true" /> Checked against all {data.instance.n_schedules} schedules
            </span>
          </div>
        </motion.section>

        <div className="pointer-events-none flex flex-col justify-between gap-4">
          <motion.p {...rise(0.15)} className={`pointer-events-auto ${compact ? "self-start" : "self-end"}`} aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={scene}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className="inline-flex items-center gap-2 rounded-full bg-foreground/85 px-4 py-2 text-[16px] font-semibold text-white backdrop-blur"
              >
                <span className="font-mono text-[12px] opacity-70">{scene + 1}/{SCENES.length}</span>
                {SCENES[scene].caption}
              </motion.span>
            </AnimatePresence>
          </motion.p>
          <motion.div {...rise(0.25)} className="pointer-events-auto">
            <MiniScene />
          </motion.div>
        </div>

        <motion.ol {...rise(0.4)} className={`pointer-events-auto grid gap-3 p-3 ${glass} ${compact ? "grid-cols-1" : "col-span-2 grid-cols-3"}`} aria-label="The story in three steps">
          {STEPS.map((s, k) => {
            const on = k === step;
            return (
              <li key={s.label}>
                <button
                  onClick={() => setScene(SCENES.findIndex((x) => x.step === k))}
                  aria-current={on ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-300 ${on ? "bg-white shadow-sm ring-1 ring-border" : "hover:bg-white/60"}`}
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${on ? "bg-carbon text-white" : "bg-muted text-foreground/60"}`}>
                    <s.Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-mono text-[12px] text-foreground/60">Step {k + 1}</span>
                    <span className={`block text-[18px] font-semibold ${on ? "text-foreground" : "text-foreground/70"}`}>{s.label}</span>
                  </span>
                  {k < STEPS.length - 1 && !compact && <ArrowRight className="ml-auto size-5 text-foreground/40" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </motion.ol>
      </div>
    </div>
  );
}

function Saving({ tone, value, unit, delay, small = false }: { tone: "carbon" | "water"; value: number; unit: string; delay: number; small?: boolean }) {
  const carbon = tone === "carbon";
  const Icon = carbon ? Leaf : Droplet;
  return (
    <div>
      <p className={`flex items-center ${small ? "text-[38px]" : "text-[58px]"} leading-none font-semibold tracking-tight tabular-nums ${carbon ? "text-emerald-700" : "text-blue-700"}`}>
        <Icon className={`mr-3 ${small ? "size-8" : "size-11"}`} aria-hidden="true" />
        <CountUp to={value} delay={delay} duration={1.6} />
        <span className={`ml-2 self-end pb-1.5 ${small ? "text-[15px]" : "text-[21px]"} font-semibold whitespace-nowrap ${carbon ? "text-emerald-900" : "text-blue-900"}`}>{unit}</span>
      </p>
      <p className={`mt-2 ${small ? "pl-11" : "pl-14"}`}><Badge kind="illustrative" label="Illustrative data" /></p>
    </div>
  );
}

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsLeft, ChevronsRight, CodeXml, Expand, Pause, Play } from "lucide-react";
import { useApp } from "@/lib/data";
import { SCREENS } from "@/lib/screens";
import { FALLBACK_CAPTIONS, type CaptionId } from "@/lib/story";
import { toggleFullscreen } from "@/lib/keys";
import { prefersReducedMotion } from "@/format";
import { Logo } from "@/components/site/Site";

export const REPO = "https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200";

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { screen, go, playing, togglePlay } = useApp();
  return (
    <nav
      aria-label="Screens"
      className={`flex shrink-0 flex-col border-r border-border bg-muted/50 py-5 transition-[width] duration-300 ${open ? "w-[220px] px-4" : "w-[76px] px-3"}`}
    >
      <div className={`flex items-center ${open ? "justify-between px-2" : "justify-center"}`}>
        {open ? <Logo /> : <span className="sr-only">GreenQ</span>}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-foreground"
        >
          {open ? <ChevronsLeft className="size-5" aria-hidden="true" /> : <ChevronsRight className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <ol className="mt-8 flex flex-col gap-1">
        {SCREENS.map((s, i) => {
          const active = i === screen;
          return (
            <li key={s.key}>
              <button
                onClick={() => go(i)}
                aria-current={active ? "page" : undefined}
                title={open ? undefined : `${i + 1} · ${s.label}`}
                className={`relative flex w-full items-center gap-3 rounded-xl py-2.5 text-[16px] font-medium transition-colors ${open ? "px-3" : "justify-center px-0"} ${active ? "text-foreground" : "text-muted-foreground hover:bg-white/70 hover:text-foreground"}`}
              >
                {active && (
                  <motion.span
                    layoutId="side-active"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-border"
                    transition={prefersReducedMotion() ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0.15 }}
                  />
                )}
                <s.Icon className="relative size-5 shrink-0" aria-hidden="true" />
                {open && <span className="relative flex-1 text-left">{s.label}</span>}
                {open && <kbd className="relative font-mono text-[11px] text-muted-foreground">{i + 1}</kbd>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-2">
        <button
          data-story-control
          onClick={togglePlay}
          className={`flex items-center gap-2 rounded-xl bg-foreground py-2.5 text-[15px] font-medium text-white hover:opacity-85 ${open ? "px-3.5" : "justify-center"}`}
          title="Play the story (P)"
        >
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {open && (playing ? "Pause story" : "Play story")}
          {open && <kbd className="ml-auto font-mono text-[11px] opacity-60">P</kbd>}
        </button>
        <button
          onClick={() => void toggleFullscreen()}
          className={`flex items-center gap-2 rounded-xl py-2 text-[14px] text-muted-foreground hover:bg-white hover:text-foreground ${open ? "px-3.5" : "justify-center"}`}
          title="Full screen (F, Esc to leave)"
        >
          <Expand className="size-4" aria-hidden="true" /> {open && "Full screen"}
          {open && <kbd className="ml-auto font-mono text-[11px]">F</kbd>}
        </button>
        <a
          href={REPO}
          className={`flex items-center gap-2 rounded-xl py-2 text-[14px] text-muted-foreground hover:bg-white hover:text-foreground ${open ? "px-3.5" : "justify-center"}`}
          title="Source code"
        >
          <CodeXml className="size-4" aria-hidden="true" /> {open && "Code"}
        </a>
      </div>
    </nav>
  );
}

/** Thin footer: progress, the honesty line, keyboard hint. */
export function FooterBar() {
  const { screen, go } = useApp();
  return (
    <footer className="flex h-[52px] shrink-0 items-center gap-6 border-t border-border px-8 text-[13px] text-muted-foreground">
      <span className="font-medium text-foreground">Team Response200 · VTU Qiskit Fall Fest 2026 · Track 6</span>
      <div className="flex flex-1 items-center justify-center gap-1.5" aria-label={`Screen ${screen + 1} of ${SCREENS.length}`}>
        {SCREENS.map((s, i) => (
          <button key={s.key} onClick={() => go(i)} aria-label={`Go to ${s.label}`} className="group py-2">
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === screen ? "w-10 bg-foreground" : i < screen ? "w-5 bg-foreground/40" : "w-5 bg-foreground/15 group-hover:bg-foreground/30"}`} />
          </button>
        ))}
      </div>
      <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-800 ring-1 ring-rose-200">Not quantum advantage · a laptop is the referee</span>
      <span className="hidden font-mono text-[12px] xl:inline">← → · 1–6 · P · F</span>
    </footer>
  );
}

/** Story caption, bottom centre of the stage. */
export function Caption({ text, id }: { text: string | null; id: CaptionId | null }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-8" aria-live="polite">
      <AnimatePresence mode="wait">
        {id && (
          <motion.p
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="max-w-[900px] rounded-2xl bg-foreground/90 px-6 py-3 text-center text-[20px] leading-snug font-medium text-white shadow-2xl backdrop-blur"
          >
            {text ?? FALLBACK_CAPTIONS[id]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Slide transition: short spring slide + fade, direction-aware. */
export function Stage({ screen, dir, children }: { screen: number; dir: number; children: ReactNode }) {
  const reduced = prefersReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={screen}
        custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 48 }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -32 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={reduced ? { duration: 0 } : { x: { type: "spring", visualDuration: 0.3, bounce: 0.12 }, opacity: { duration: 0.22 } }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

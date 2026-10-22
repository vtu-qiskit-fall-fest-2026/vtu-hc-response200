import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { useApp } from "@/lib/data";
import { useCompact } from "@/lib/stage";
import { Hero, useHeroClock } from "./Hero";

/** Start: the wordless hero loop, one button, a key hint. Nothing else. */
export function StartScreen() {
  const { playing, togglePlay } = useApp();
  const compact = useCompact();
  const [hover, setHover] = useState(false);
  const phase = useHeroClock(hover || playing);
  return (
    <div className="relative h-full">
      <div
        className={`absolute overflow-hidden ${compact ? "-inset-4" : "-inset-x-10 -top-8 -bottom-7"}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        data-tour="hero"
      >
        <Hero phase={phase} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
        <button
          data-story-control
          data-tour="play"
          onClick={togglePlay}
          className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-foreground px-8 py-4 text-[20px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-px focus-visible:outline-offset-4"
        >
          {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          {playing ? "Pause" : "Play the story"}
          <kbd className="ml-1 rounded-md bg-white/15 px-2 py-0.5 font-mono text-[13px]">P</kbd>
        </button>
      </div>
    </div>
  );
}

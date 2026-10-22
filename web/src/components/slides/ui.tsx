import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Info as InfoIcon, Sparkles } from "lucide-react";
import { useApp } from "@/lib/data";
import { n0, prefersReducedMotion } from "@/format";

/* ------------------------------------------------------------------ honesty badges */

export type BadgeKind = "illustrative" | "cited" | "real" | "ai" | "template" | "live";

const BADGE: Record<BadgeKind, { text: string; cls: string; title: string }> = {
  illustrative: { text: "Illustrative", cls: "bg-amber-50 text-amber-800 ring-amber-200", title: "Chosen for the example, not measured" },
  cited: { text: "Cited", cls: "bg-sky-50 text-sky-800 ring-sky-200", title: "Public figure with a source (About screen)" },
  real: { text: "Real IBM run", cls: "bg-foreground text-white ring-foreground", title: "Measured on IBM quantum hardware; job IDs saved" },
  ai: { text: "AI explanation", cls: "bg-violet-50 text-violet-800 ring-violet-200", title: "Written by a language model from GreenQ's saved results; every number is checked against them" },
  template: { text: "Template", cls: "bg-muted text-muted-foreground ring-border", title: "Written by a fixed template from GreenQ's saved results" },
  live: { text: "Live simulator, not hardware", cls: "bg-amber-50 text-amber-900 ring-amber-300", title: "Computed now on this computer's simulator" },
};

export function Badge({ kind, label }: { kind: BadgeKind; label?: string }) {
  const b = BADGE[kind];
  return (
    <span title={b.title} className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ring-1 ${b.cls}`}>
      {kind === "real" && <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />}
      {kind === "ai" && <Sparkles className="size-3" aria-hidden="true" />}
      {label ?? b.text}
    </span>
  );
}

/* ------------------------------------------------------------------ "i" popover */

/** At most two short lines of extra context, on demand. */
export function Info({ children, side = "bottom" }: { children: ReactNode; side?: "bottom" | "top" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="More information"
        onClick={() => setOpen((o) => !o)}
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <InfoIcon className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <motion.span
          id={id}
          role="note"
          initial={{ opacity: 0, y: side === "bottom" ? -4 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className={`absolute left-1/2 z-50 w-[380px] -translate-x-1/2 rounded-xl bg-foreground px-3.5 py-2.5 text-[13px] leading-snug font-normal tracking-normal text-white normal-case shadow-xl ${side === "bottom" ? "top-8" : "bottom-8"}`}
        >
          {children}
        </motion.span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ screen frame */

export function Screen({ title, info, right, children }: { title: string; info?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="flex items-center gap-2 text-[38px] leading-none font-semibold tracking-[-0.03em]">
          {title}
          {info && <Info>{info}</Info>}
        </h1>
        {right && <div className="flex flex-wrap items-center gap-2.5">{right}</div>}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  const { flash } = useApp();
  const lit = !!id && flash === id;
  return (
    <motion.section
      data-widget={id}
      className={`relative min-h-0 min-w-0 rounded-3xl bg-white ring-1 ring-border ${className}`}
      animate={lit && !prefersReducedMotion() ? { boxShadow: ["0 0 0 0px rgba(124,58,237,0)", "0 0 0 6px rgba(124,58,237,0.45)", "0 0 0 0px rgba(124,58,237,0)"] } : undefined}
      transition={{ duration: 1.4, delay: 0.35 }}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ segmented control */

export function Segmented<T extends string | number>({ value, options, onChange, label, size = "md" }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; size?: "md" | "lg";
}) {
  return (
    <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full font-semibold whitespace-nowrap transition-colors ${size === "lg" ? "px-5 py-2 text-[16px]" : "px-3.5 py-1.5 text-[13px]"} ${o.value === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ count-up */

export function CountUp({ to, from = 0, format = n0, duration = 1.2, delay = 0 }: { to: number; from?: number; format?: (v: number) => string; duration?: number; delay?: number }) {
  const mv = useMotionValue(prefersReducedMotion() ? to : from);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (prefersReducedMotion()) return void mv.set(to);
    const c = animate(mv, to, { duration, delay, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [to, mv, duration, delay]);
  return <motion.span>{text}</motion.span>;
}

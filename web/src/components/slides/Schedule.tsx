import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { JOB_STYLE, VIEW_LABEL, useApp, whyLines, type View } from "@/lib/data";
import { n0, priorityLabel, prefersReducedMotion } from "@/format";
import { Board, RULE_ICON, Tickers } from "@/components/dashboard/Scene";
import { PrioritySlider, TradeOff } from "@/components/dashboard/Panels";
import { useExplain } from "@/lib/llm";
import { Badge, Card, Info, Screen, Segmented } from "./ui";

/** The four jobs as chips; the "data packets" start here. */
function JobStrip() {
  const { data, preset } = useApp();
  return (
    <div className="flex gap-2">
      {data.instance.jobs.map((j, i) => (
        <span key={j.key} data-chip={i} className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 ${JOB_STYLE[i].cls} ${JOB_STYLE[i].text}`}>
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[15px] font-semibold">
            {JOB_STYLE[i].short}
            {(preset.rules[j.key] ?? []).map((r) => {
              const { Icon, label } = RULE_ICON[r];
              return <Icon key={r} className="size-4 shrink-0" aria-label={label}><title>{label}</title></Icon>;
            })}
          </span>
          <span className="shrink-0 text-[13px] opacity-80 tabular-nums">{n0(j.it_energy_kwh)} kWh</span>
        </span>
      ))}
    </div>
  );
}

type Line = { key: string; d: string; color: string; end: [number, number] };

/** A short line from each moved job's chip to the lane it was sent to, drawn once. */
function Packets({ box }: { box: React.RefObject<HTMLDivElement | null> }) {
  const { data, stop, view, preset } = useApp();
  const [lines, setLines] = useState<Line[]>([]);
  const [run, setRun] = useState(0);
  const sched = stop.best.schedule.join("");
  useLayoutEffect(() => {
    const root = box.current;
    if (!root || view !== "greenq" || prefersReducedMotion()) return setLines([]);
    const r0 = root.getBoundingClientRect();
    const out: Line[] = [];
    stop.best.schedule.forEach((k, j) => {
      if (data.naive.schedule[j] === k) return;
      const chip = root.querySelector(`[data-chip="${j}"]`)?.getBoundingClientRect();
      const lane = root.querySelector(`[data-lane="${k}"]`)?.getBoundingClientRect();
      if (!chip || !lane) return;
      const x1 = chip.left + chip.width / 2 - r0.left, y1 = chip.bottom - r0.top;
      const x2 = lane.left + lane.width / 2 - r0.left, y2 = lane.top + 18 - r0.top;
      const my = (y1 + y2) / 2;
      out.push({ key: `${j}-${k}`, d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, color: "var(--carbon)", end: [x2, y2] });
    });
    setLines(out);
    setRun((n) => n + 1);
  }, [view, sched, preset.key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lines.length) return null;
  return (
    <svg key={run} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
      {lines.map((l, i) => (
        <g key={l.key}>
          <motion.path
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray="5 5"
            initial={{ pathLength: 0, opacity: 0.9 }}
            animate={{ pathLength: 1, opacity: [0.9, 0.9, 0] }}
            transition={{ pathLength: { duration: 0.6, delay: i * 0.08, ease: "easeOut" }, opacity: { duration: 2.2, times: [0, 0.6, 1], delay: i * 0.08 } }}
          />
          <motion.circle
            r={5}
            fill="var(--carbon)"
            cx={l.end[0]}
            cy={l.end[1]}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.4, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 2.2, times: [0, 0.3, 1], delay: 0.5 + i * 0.08 }}
          />
        </g>
      ))}
    </svg>
  );
}

function WhyCaption() {
  const { data, stop, view, preset } = useApp();
  const fallback = whyLines(data, data.naive.schedule, stop.best.schedule).map((l) => l.text);
  const { lines, source } = useExplain(preset.key, stop.w, fallback);
  return (
    <Card id="why" className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">Why this schedule</h2>
        <Badge kind={source === "template" ? "template" : "ai"} />
      </div>
      {view === "before" ? (
        <p className="mt-2 text-[15px] text-muted-foreground">Run now: every job starts at home, the moment it arrives.</p>
      ) : lines.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted-foreground">Nothing moves: run now is already the best here.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[15px] leading-snug">
          {lines.slice(0, 3).map((t) => (
            <motion.li key={t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{t}</motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ScheduleScreen() {
  const { data, view, setView, preset, setPreset, stop, onHardware } = useApp();
  const box = useRef<HTMLDivElement>(null);
  // First visit: show Run now, then let the jobs move (unless the story drives it).
  const { playing } = useApp();
  useEffect(() => {
    if (playing || prefersReducedMotion() || view === "greenq") return;
    const t = window.setTimeout(() => setView("greenq"), 1200);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen
      title="Same jobs. Better where and when."
      info={<>Run now: each job starts at its home site when it arrives. Run smart: the best of all {data.instance.n_schedules} schedules for this priority.</>}
      right={
        <>
          <Badge kind="cited" label="Cited grid carbon" />
          <Badge kind="illustrative" label="Illustrative jobs + sites" />
        </>
      }
    >
      <div className="grid h-full grid-cols-[1fr_440px] gap-5">
        <Card id="schedule" className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <Segmented<View> size="lg" label="Which schedule" value={view} onChange={setView}
              options={[{ value: "before", label: VIEW_LABEL.before }, { value: "greenq", label: VIEW_LABEL.greenq }]} />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">Job rules</span>
              <Segmented label="Job rules" value={preset.key} onChange={setPreset}
                options={data.flex.presets.map((p) => ({ value: p.key, label: p.label }))} />
              <Info>Lock: data stays at its home site. Clock: must finish by day. Star: runs in the slot it was submitted to.</Info>
            </div>
          </div>
          <div ref={box} className="relative flex min-h-0 flex-1 flex-col gap-3">
            <JobStrip />
            <div className="min-h-0 flex-1"><Board /></div>
            <Packets box={box} />
          </div>
          <Tickers />
        </Card>

        <div className="flex min-h-0 flex-col gap-5">
          <Card id="priority" className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold">What matters more?</h2>
              {onHardware ? <Badge kind="real" /> : <span className="text-[12px] text-muted-foreground">exact best, checked by laptop</span>}
            </div>
            <p className="mt-2 mb-4 text-[30px] leading-none font-semibold tracking-tight">{priorityLabel(stop.w)}</p>
            <PrioritySlider />
          </Card>
          <Card id="tradeoff" className="flex min-h-0 flex-1 flex-col p-5">
            <TradeOff />
          </Card>
          <WhyCaption />
        </div>
      </div>
    </Screen>
  );
}

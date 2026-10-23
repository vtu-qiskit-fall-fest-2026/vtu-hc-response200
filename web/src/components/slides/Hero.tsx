import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Droplet, Leaf, Moon, Sun } from "lucide-react";
import { JOB_STYLE, useApp } from "@/lib/data";
import { n0, prefersReducedMotion } from "@/format";
import type { UiData } from "@/types";

/**
 * The Start screen hero: a wordless 16-second loop that tells the story.
 *   0 Night  (0-4 s)   jobs pile up at their home sites ("run now"), haze and steam rise
 *   1 Chip   (4-8 s)   a quantum chip appears; its qubits link and pulse (QAOA)
 *   2 Move   (8-11 s)  jobs slide to the run-smart site and slot; haze thins, steam shrinks
 *   3 Saved  (11-15 s) the two savings count up from results/ui_data.json
 *   4 Reset  (15-16 s) fade, then loop
 * One phase clock drives it. Hover holds the current phase; reduced motion shows phase 3 still.
 */
export const PHASE_MS = [4000, 4000, 3000, 4000, 1000];
export type Phase = 0 | 1 | 2 | 3 | 4;

export function useHeroClock(paused: boolean, hold: number | null = null, restart = 0) {
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 3 : 0);
  useEffect(() => { if (restart) setPhase(0); }, [restart]);
  useEffect(() => {
    if (hold !== null) setPhase(hold as Phase);
  }, [hold]);
  useEffect(() => {
    if (reduced || paused || hold !== null) return;
    const t = window.setTimeout(() => setPhase((p) => ((p + 1) % 5) as Phase), PHASE_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase, paused, reduced, hold]);
  return phase;
}

const VW = 1380, VH = 840;
const HEX = ["#8b5cf6", "#fbbf24", "#ec4899", "#334155"]; // same hues as JOB_STYLE
const SITES = { evap: { x: 110, w: 380 }, air: { x: 890, w: 380 } } as const;
const LANE_Y = { day: 566, night: 656 } as const;
const LANE_H = 70;
const BLOCK_H = 52;

/** Block positions for a schedule: lane by option, stacked left to right. */
function place(data: UiData, schedule: number[]) {
  const { options, jobs } = data.instance;
  const maxLoad = 2100;
  const used: Record<number, number> = {};
  return jobs.map((j, i) => {
    const o = options[schedule[i]];
    const site = SITES[o.site as "evap" | "air"];
    const w = Math.max(64, (j.it_energy_kwh / maxLoad) * (site.w - 120));
    const x = site.x + 104 + (used[schedule[i]] ?? 0);
    used[schedule[i]] = (used[schedule[i]] ?? 0) + w + 6;
    return { x, y: LANE_Y[o.slot as "day" | "night"] + (LANE_H - BLOCK_H) / 2, w };
  });
}

/** A number that counts up inside SVG text. */
function SvgCount({ to, run }: { to: number; run: boolean }) {
  const mv = useMotionValue(prefersReducedMotion() ? to : 0);
  const text = useTransform(mv, (v) => n0(v));
  useEffect(() => {
    if (prefersReducedMotion()) return void mv.set(to);
    if (!run) return void mv.set(0);
    const c = animate(mv, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [run, to, mv]);
  return <motion.tspan>{text}</motion.tspan>;
}

function Badge({ x, y, text, dark = false }: { x: number; y: number; text: string; dark?: boolean }) {
  const w = text.length * 8.4 + 22;
  return (
    <g transform={`translate(${x - w / 2} ${y})`}>
      <rect width={w} height={24} rx={6} fill={dark ? "#0b0b0f" : "#fffbeb"} stroke={dark ? "#0b0b0f" : "#fcd34d"} />
      {dark && <circle cx={11} cy={12} r={3.5} fill="#34d399" />}
      <text x={dark ? w / 2 + 5 : w / 2} y={16.5} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing="0.06em" fill={dark ? "#ffffff" : "#92400e"}>{text}</text>
    </g>
  );
}

export function Hero({ phase, onSavedShown }: { phase: Phase; onSavedShown?: () => void }) {
  const { data } = useApp();
  const reduced = prefersReducedMotion();
  const mid = data.sweep.find((s) => s.w === 0.5)!;
  const before = useMemo(() => place(data, data.naive.schedule), [data]);
  const after = useMemo(() => place(data, mid.best.schedule), [data, mid]);
  const smart = phase >= 2 && phase <= 3;
  const fired = useRef(false);
  useEffect(() => {
    if (phase !== 3 || reduced) { fired.current = false; return; }
    const t = window.setTimeout(() => { if (!fired.current) { fired.current = true; onSavedShown?.(); } }, 1700);
    return () => window.clearTimeout(t);
  }, [phase, onSavedShown, reduced]);

  // QAOA two-qubit links, taken from the real exported circuit
  const links = useMemo(() => {
    const g = data.proof.find((p) => p.w === 0.5)!.circuit_gates.filter((x) => x.kind === "zz");
    return g.map((x) => x.qubits as [number, number]);
  }, [data]);
  const CHIP = { x: 690, y: 290 };
  const qpos = (q: number) => ({ x: CHIP.x - 60 + (q % 4) * 40, y: CHIP.y - 22 + Math.floor(q / 4) * 44 });

  const T = (s: number) => (reduced ? { duration: 0 } : { duration: s, ease: [0.16, 1, 0.3, 1] as const });
  const show = (on: boolean, s = 0.6) => ({ animate: { opacity: on ? 1 : 0 }, transition: T(s) });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" role="img"
      aria-label={`Animation: four jobs pile up at their home data centres, a quantum chip works out a better plan, the jobs move to cleaner sites and times, and ${n0(mid.saved_kg_co2)} kg of CO2 and ${n0(mid.saved_litres)} litres of water are saved (illustrative data).`}>
      <defs>
        <radialGradient id="haze">
          <stop offset="0" stopColor="#64748b" stopOpacity={0.55} />
          <stop offset="1" stopColor="#64748b" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f6" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="heroClean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f8f0" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      {/* sky: hazy grey before, clean mint after */}
      <rect width={VW} height={VH} fill="url(#heroSky)" />
      <motion.rect width={VW} height={VH} fill="url(#heroClean)" initial={false} {...show(smart, 1.2)} />

      {/* fade the whole stage out and back in at the reset */}
      <motion.g initial={false} animate={{ opacity: phase === 4 ? 0 : 1 }} transition={T(0.5)}>
        {/* ground */}
        <rect x={0} y={520} width={VW} height={4} fill="#e2e8f0" />

        {/* carbon haze over both sites + thermometer */}
        {[300, 1080].map((cx) => (
          <motion.g key={cx} initial={false} animate={{ opacity: phase <= 1 ? 1 : 0.18, scale: phase <= 1 ? 1 : 0.7 }} transition={T(1.4)} style={{ transformOrigin: `${cx}px 290px` }}>
            <ellipse cx={cx} cy={290} rx={240} ry={110} fill="url(#haze)" />
            <text x={cx} y={300} textAnchor="middle" fontSize={30} fontWeight={700} fill="#475569" opacity={0.55}>CO₂</text>
          </motion.g>
        ))}
        <g transform="translate(36 150)">
          <text x={13} y={-14} textAnchor="middle" fontSize={15} fontWeight={700} fill="#475569">CO₂</text>
          <rect x={0} y={0} width={26} height={300} rx={13} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
          <motion.rect x={5} width={16} rx={8} initial={false}
            animate={{ y: phase <= 1 ? 30 : 190, height: phase <= 1 ? 265 : 105, fill: phase <= 1 ? "#f43f5e" : "#10b981" }} transition={T(1.4)} />
          <circle cx={13} cy={318} r={24} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
          <motion.circle cx={13} cy={318} r={17} initial={false} animate={{ fill: phase <= 1 ? "#f43f5e" : "#10b981" }} transition={T(1.4)} />
        </g>

        {/* Site A: building with racks + cooling tower with steam */}
        <g>
          <rect x={110} y={380} width={230} height={140} rx={8} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <rect x={128 + r * 52} y={398} width={40} height={106} rx={4} fill="#e2e8f0" />
              {[0, 1, 2, 3, 4].map((k) => (
                <motion.circle key={k} cx={138 + r * 52} cy={412 + k * 20} r={3} fill={(r + k) % 3 ? "#10b981" : "#2563eb"}
                  animate={reduced ? undefined : { opacity: [1, 0.25, 1] }} transition={{ duration: 1.2 + ((r * 5 + k) % 4) * 0.35, repeat: Infinity }} />
              ))}
            </g>
          ))}
          <path d="M372 520 C384 470 384 430 378 340 L462 340 C456 430 456 470 468 520 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
          <ellipse cx={420} cy={340} rx={42} ry={8} fill="#cbd5e1" />
          <motion.g initial={false} animate={{ scale: phase <= 1 ? 1 : 0.45, opacity: phase <= 1 ? 1 : 0.6 }} transition={T(1.4)} style={{ transformOrigin: "420px 330px" }}>
            {[[400, 300, 26], [432, 282, 32], [414, 244, 36], [448, 222, 26]].map(([x, y, r], k) => (
              <motion.circle key={k} cx={x} cy={y} r={r} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2}
                animate={reduced ? undefined : { y: [0, -10, 0] }} transition={{ duration: 3 + k * 0.4, repeat: Infinity, ease: "easeInOut" }} />
            ))}
          </motion.g>
          <path d="M420 498 q 9 -14 0 -26 q -9 12 0 26" fill="#3b82f6" />
          <text x={225} y={368} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0b0b0f">Site A <tspan fontWeight={500} fill="#475569">· water cooling</tspan></text>
        </g>

        {/* Site B: air-cooled building with rooftop fans */}
        <g>
          <rect x={890} y={400} width={380} height={120} rx={8} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <g key={r}>
              <rect x={908 + r * 60} y={418} width={46} height={86} rx={4} fill="#e2e8f0" />
              {[0, 1, 2, 3].map((k) => (
                <motion.circle key={k} cx={918 + r * 60} cy={432 + k * 20} r={3} fill={(r + k) % 3 ? "#10b981" : "#2563eb"}
                  animate={reduced ? undefined : { opacity: [1, 0.25, 1] }} transition={{ duration: 1.3 + ((r * 3 + k) % 4) * 0.3, repeat: Infinity }} />
              ))}
            </g>
          ))}
          {[960, 1080, 1200].map((cx) => (
            <g key={cx}>
              <rect x={cx - 34} y={356} width={68} height={44} rx={6} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
              <motion.g style={{ transformOrigin: `${cx}px 378px` }} animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}>
                <circle cx={cx} cy={378} r={16} fill="none" stroke="#64748b" strokeWidth={2} />
                <path d={`M${cx} ${364} L${cx + 4} ${378} L${cx} ${392} L${cx - 4} ${378} Z M${cx - 14} ${378} L${cx} ${374} L${cx + 14} ${378} L${cx} ${382} Z`} fill="#64748b" />
              </motion.g>
            </g>
          ))}
          <text x={1080} y={340} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0b0b0f">Site B <tspan fontWeight={500} fill="#475569">· air cooling</tspan></text>
        </g>

        <g data-tour="jobs">
        {/* lanes: day and night at each site */}
        {(["evap", "air"] as const).map((s) =>
          (["day", "night"] as const).map((t) => (
            <g key={`${s}${t}`}>
              <rect x={SITES[s].x} y={LANE_Y[t]} width={SITES[s].w} height={LANE_H} rx={12} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} />
              {t === "day"
                ? <Sun x={SITES[s].x + 12} y={LANE_Y[t] + 23} width={24} height={24} color="#f59e0b" />
                : <Moon x={SITES[s].x + 12} y={LANE_Y[t] + 23} width={24} height={24} color="#6366f1" />}
              <text x={SITES[s].x + 42} y={LANE_Y[t] + 33} fontSize={17} fontWeight={600} fill="#334155">{t === "day" ? "Day" : "Night"}</text>
              <text x={SITES[s].x + 42} y={LANE_Y[t] + 52} fontSize={12} fill="#64748b">{t === "day" ? "cleaner" : "dirtier"}</text>
            </g>
          )),
        )}

        </g>

        {/* the quantum chip: qubits link and pulse */}
        <motion.g initial={false} animate={{ opacity: phase === 1 || phase === 2 ? 1 : 0, scale: phase === 1 || phase === 2 ? 1 : 0.85 }} transition={T(0.6)} style={{ transformOrigin: `${CHIP.x}px ${CHIP.y}px` }}>
          <rect x={CHIP.x - 100} y={CHIP.y - 80} width={200} height={160} rx={18} fill="#1e293b" stroke="#c9a14a" strokeWidth={4} />
          {Array.from({ length: 7 }, (_, k) => (
            <g key={k}>
              <rect x={CHIP.x - 84 + k * 26} y={CHIP.y - 94} width={8} height={14} rx={2} fill="#c9a14a" />
              <rect x={CHIP.x - 84 + k * 26} y={CHIP.y + 80} width={8} height={14} rx={2} fill="#c9a14a" />
            </g>
          ))}
          {links.map(([a, b], k) => {
            const p = qpos(a), q = qpos(b);
            return (
              <motion.path key={k} d={`M${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${(p.y + q.y) / 2 - 18} ${q.x} ${q.y}`} fill="none" stroke="#34d399" strokeWidth={2}
                initial={false} animate={phase === 1 && !reduced ? { pathLength: [0, 1], opacity: [0, 1, 0.4] } : { pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.9, delay: 0.3 + k * 0.12, repeat: phase === 1 && !reduced ? 2 : 0, repeatDelay: 0.3 }} />
            );
          })}
          {Array.from({ length: 8 }, (_, q) => {
            const p = qpos(q);
            return (
              <motion.circle key={q} cx={p.x} cy={p.y} r={8} fill={q % 2 ? "#60a5fa" : "#34d399"}
                animate={phase === 1 && !reduced ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, delay: q * 0.08, repeat: phase === 1 && !reduced ? 3 : 0 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
            );
          })}
          <motion.g initial={false} animate={phase === 1 && !reduced ? { opacity: [0, 1, 0.3, 1, 0.6, 1] } : { opacity: 1 }} transition={{ duration: 1.4, delay: 0.4 }}>
            <Badge x={CHIP.x} y={CHIP.y - 136} text="REAL IBM RUN" dark />
          </motion.g>
          <motion.g initial={false} animate={{ opacity: 1 }}>
            <text x={CHIP.x} y={CHIP.y + 124} textAnchor="middle" fontSize={17} fontWeight={700} fill="#0b0b0f">Quantum computer</text>
            <text x={CHIP.x} y={CHIP.y + 146} textAnchor="middle" fontSize={14} fill="#475569">QAOA · {data.circuit.n_qubits} qubits</text>
          </motion.g>
        </motion.g>

        {/* packet paths: drawn while the jobs move */}
        {before.map((b, i) => {
          const a = after[i];
          if (b.x === a.x && b.y === a.y) return null;
          const x1 = b.x + b.w / 2, y1 = b.y, x2 = a.x + a.w / 2, y2 = a.y;
          return (
            <motion.path key={i} d={`M${x1} ${y1} C ${x1} ${y1 - 180} ${x2} ${y2 - 180} ${x2} ${y2}`} fill="none" stroke={HEX[i]} strokeWidth={3} strokeDasharray="7 7"
              initial={false} animate={phase === 2 && !reduced ? { pathLength: [0, 1], opacity: [0.9, 0.9, 0] } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 2.4, times: [0, 0.4, 1], delay: i * 0.1 }} />
          );
        })}

        {/* job blocks: home slot (run now) -> best slot (run smart), along an arc */}
        {data.instance.jobs.map((j, i) => {
          const a = before[i], b = after[i];
          const to = smart ? b : a;
          const arc = smart && phase === 2 && !reduced;
          return (
            <motion.g key={j.key} initial={false}
              animate={arc ? { x: [a.x, (a.x + b.x) / 2, b.x], y: [a.y, Math.min(a.y, b.y) - 170, b.y] } : { x: to.x, y: to.y }}
              transition={reduced || phase === 0 ? { duration: 0 } : { duration: 1.5, delay: 0.25 + i * 0.12, ease: [0.45, 0, 0.2, 1] }}>
              <motion.rect height={BLOCK_H} rx={10} fill={HEX[i]} initial={false} animate={{ width: to.w }} transition={{ duration: 0 }} />
              <text x={10} y={32} fontSize={14} fontWeight={700} fill={i === 1 ? "#451a03" : "#ffffff"}>{JOB_STYLE[i].short.split(" ")[0]}</text>
            </motion.g>
          );
        })}

        {/* what the steam is */}
        <motion.text x={366} y={226} textAnchor="end" fontSize={14} fill="#475569" initial={false} animate={{ opacity: phase <= 1 ? 1 : 0 }} transition={T(0.8)}>water lost as steam</motion.text>

        {/* one short caption per step */}
        <AnimatePresence mode="wait">
          <motion.g key={phase === 4 ? 3 : phase} initial={{ opacity: 0, y: reduced ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T(0.4)}>
            {(() => {
              const text = [
                "Run now: every job runs at home, when it arrives",
                `A quantum computer searches all ${data.instance.n_schedules} plans`,
                "Run smart: jobs move to a better place and time",
                "Same jobs, less carbon and less water",
                "Same jobs, less carbon and less water",
              ][phase];
              const w = text.length * 10.6 + 70;
              return (
                <g transform={`translate(${VW / 2 - w / 2} 26)`}>
                  <rect width={w} height={42} rx={21} fill="#0b0b0f" opacity={0.88} />
                  <text x={22} y={27} fontSize={15} fontWeight={700} fill="#34d399">{Math.min(phase, 3) + 1}/4</text>
                  <text x={62} y={27} fontSize={18} fontWeight={600} fill="#ffffff">{text}</text>
                </g>
              );
            })()}
          </motion.g>
        </AnimatePresence>

        {/* savings, counted up from the data */}
        <motion.g initial={false} {...show(phase === 3, 0.6)}>
          <g transform="translate(330 96)">
            <rect width={360} height={150} rx={22} fill="#ffffff" opacity={0.92} stroke="#d1fae5" strokeWidth={2} />
            <Leaf x={24} y={34} width={52} height={52} color="#059669" />
            <text x={92} y={84} fontSize={64} fontWeight={700} fill="#047857" style={{ fontVariantNumeric: "tabular-nums" }}>
              <SvgCount to={mid.saved_kg_co2} run={phase === 3} />
            </text>
            <text x={94} y={118} fontSize={20} fontWeight={600} fill="#065f46">kg CO₂ less</text>
            <Badge x={292} y={104} text="ILLUSTRATIVE" />
          </g>
          <g transform="translate(710 96)">
            <rect width={360} height={150} rx={22} fill="#ffffff" opacity={0.92} stroke="#dbeafe" strokeWidth={2} />
            <Droplet x={24} y={34} width={52} height={52} color="#2563eb" />
            <text x={92} y={84} fontSize={64} fontWeight={700} fill="#1d4ed8" style={{ fontVariantNumeric: "tabular-nums" }}>
              <SvgCount to={mid.saved_litres} run={phase === 3} />
            </text>
            <text x={94} y={118} fontSize={20} fontWeight={600} fill="#1e3a8a">L water less</text>
            <Badge x={292} y={104} text="ILLUSTRATIVE" />
          </g>
        </motion.g>
      </motion.g>
    </svg>
  );
}

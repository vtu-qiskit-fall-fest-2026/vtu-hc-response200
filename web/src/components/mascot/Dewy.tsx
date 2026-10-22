import { useEffect, useState } from "react";
import { AnimatePresence, motion, type TargetAndTransition } from "motion/react";
import { prefersReducedMotion } from "@/format";

/**
 * Dewy: GreenQ's guide. An original water drop with a leaf sprout (water + carbon).
 * Eyes only, no mouth: personality comes from eye shape, body squash and the leaf.
 * Always alive: it blinks at random and breathes. Under reduced motion it holds a
 * still expression for each mood.
 */
export const MOODS = [
  "idle", "waking", "thinking", "working", "excited", "celebrate", "confused",
  "drowsy", "sleeping", "laughing", "curious", "proud",
] as const;
export type Mood = (typeof MOODS)[number];

type Eye = "open" | "wide" | "half" | "closed" | "happy" | "squint";
interface Look {
  eye: Eye;
  eyeScale?: number;
  leaf: number;              // leaf angle (deg): + perks up, - droops
  body?: TargetAndTransition; // looped body motion
  tilt?: number;             // whole-body lean (deg)
  fx?: "sparkles" | "question" | "zz" | "dots" | "gear";
  oddEye?: boolean;          // confused: one eye bigger
}

const LOOK: Record<Mood, Look> = {
  idle: { eye: "open", leaf: 0 },
  waking: { eye: "half", leaf: -15, body: { scaleY: [0.92, 1.06, 1] }, },
  thinking: { eye: "open", eyeScale: 0.85, leaf: -8, tilt: -4, fx: "dots" },
  working: { eye: "squint", leaf: 6, body: { y: [0, -3, 0] }, fx: "gear" },
  excited: { eye: "wide", leaf: 18, body: { y: [0, -10, 0] } },
  celebrate: { eye: "happy", leaf: 22, body: { y: [0, -18, 0], rotate: [0, -6, 6, 0] }, fx: "sparkles" },
  confused: { eye: "open", leaf: -10, tilt: -9, fx: "question", oddEye: true },
  drowsy: { eye: "half", leaf: -30, body: { rotate: [-2, 2, -2] } },
  sleeping: { eye: "closed", leaf: -42, fx: "zz" },
  laughing: { eye: "happy", leaf: 14, body: { rotate: [-5, 5, -5], y: [0, -4, 0] } },
  curious: { eye: "wide", eyeScale: 1.05, leaf: 10, tilt: 7 },
  proud: { eye: "happy", leaf: 20, body: { scaleY: [1, 1.05, 1] } },
};

const BODY_LOOP: Partial<Record<Mood, number>> = { working: 0.5, excited: 0.6, celebrate: 0.7, drowsy: 2.6, laughing: 0.35, proud: 1.6 };

/** One eye; looks toward (lx, ly) in -1..1. */
function EyeShape({ cx, cy, kind, scale, blink, lx, ly }: { cx: number; cy: number; kind: Eye; scale: number; blink: boolean; lx: number; ly: number }) {
  const x = cx + lx * 4, y = cy + ly * 3;
  const ink = "#0f2a4a";
  if (kind === "closed") return <path d={`M${x - 7} ${y} Q ${x} ${y + 5} ${x + 7} ${y}`} stroke={ink} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
  if (kind === "happy") return <path d={`M${x - 7} ${y + 2} Q ${x} ${y - 7} ${x + 7} ${y + 2}`} stroke={ink} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  const ry = { open: 9, wide: 11, half: 4.5, squint: 3.5 }[kind] * scale;
  const rx = (kind === "wide" ? 7.5 : 6.5) * scale;
  return (
    <motion.g animate={{ scaleY: blink && kind !== "half" ? 0.1 : 1 }} transition={{ duration: 0.09 }} style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={ink} />
      {kind !== "squint" && <circle cx={x + 2.2} cy={y - ry * 0.45} r={Math.min(2.4, ry * 0.35)} fill="#ffffff" />}
    </motion.g>
  );
}

function Effect({ fx }: { fx: NonNullable<Look["fx"]> }) {
  const reduced = prefersReducedMotion();
  const loop = (a: TargetAndTransition, d = 1.2) => (reduced ? {} : { animate: a, transition: { duration: d, repeat: Infinity } });
  if (fx === "sparkles")
    return (
      <g fill="#f59e0b">
        {[[14, 36], [104, 30], [20, 96], [108, 90]].map(([x, y], i) => (
          <motion.path key={i} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
            style={{ transformOrigin: `${x}px ${y}px` }} {...loop({ scale: [0.4, 1.2, 0.4], opacity: [0.4, 1, 0.4] }, 0.9 + i * 0.15)} />
        ))}
      </g>
    );
  if (fx === "question")
    return <motion.text x={98} y={34} fontSize={30} fontWeight={800} fill="#7c3aed" {...loop({ y: [34, 28, 34] }, 1.4)}>?</motion.text>;
  if (fx === "zz")
    return (
      <g fill="#64748b" fontWeight={800}>
        <motion.text x={92} y={40} fontSize={16} {...loop({ opacity: [0, 1, 0], y: [44, 30, 22] }, 2.2)}>z</motion.text>
        <motion.text x={102} y={26} fontSize={22} {...loop({ opacity: [0, 1, 0], y: [30, 16, 8] }, 2.6)}>Z</motion.text>
      </g>
    );
  if (fx === "dots")
    return (
      <g fill="#94a3b8">
        {[0, 1, 2].map((i) => (
          <motion.circle key={i} cx={92 + i * 9} cy={30} r={3.5} {...loop({ opacity: [0.2, 1, 0.2] }, 1)} transition={reduced ? undefined : { duration: 1, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </g>
    );
  return (
    <motion.g style={{ transformOrigin: "104px 32px" }} {...loop({ rotate: 360 }, 2)} transition={reduced ? undefined : { duration: 2, repeat: Infinity, ease: "linear" }}>
      <circle cx={104} cy={32} r={9} fill="none" stroke="#059669" strokeWidth={4} strokeDasharray="4 3" />
      <circle cx={104} cy={32} r={3} fill="#059669" />
    </motion.g>
  );
}

export function Dewy({ mood = "idle", size = 110, look = [0, 0], onClick }: { mood?: Mood; size?: number; look?: [number, number]; onClick?: () => void }) {
  const reduced = prefersReducedMotion();
  const L = LOOK[mood];
  const [blink, setBlink] = useState(false);

  // random blinking, every 3-6 s
  useEffect(() => {
    if (reduced) return;
    let t: number;
    const next = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 130);
        next();
      }, 3000 + Math.random() * 3000);
    };
    next();
    return () => window.clearTimeout(t);
  }, [reduced]);

  const [lx, ly] = mood === "thinking" ? [0.6, -0.8] : mood === "sleeping" || mood === "drowsy" ? [0, 0.4] : look;
  const scale = L.eyeScale ?? 1;
  const loopBody = !reduced && L.body;
  return (
    <motion.svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      onClick={onClick}
      role="img"
      aria-label={`Dewy the GreenQ guide, feeling ${mood}`}
      className="overflow-visible"
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <defs>
        <linearGradient id="dewyBody" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="0.55" stopColor="#7cb4f8" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* soft shadow */}
      <motion.ellipse cx={60} cy={142} rx={34} ry={6} fill="#0f172a" opacity={0.12}
        animate={loopBody && L.body?.y ? { rx: [34, 28, 34], opacity: [0.12, 0.07, 0.12] } : undefined}
        transition={{ duration: BODY_LOOP[mood] ?? 1, repeat: Infinity }} />
      <motion.g
        style={{ transformOrigin: "60px 138px" }}
        animate={{ rotate: L.tilt ?? 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.4, bounce: 0.3 }}
      >
        {/* breathing (always) + the mood's body loop */}
        <motion.g
          style={{ transformOrigin: "60px 138px" }}
          animate={loopBody ? L.body : reduced ? undefined : { scaleY: [1, 1.025, 1], scaleX: [1, 0.99, 1] }}
          transition={{ duration: BODY_LOOP[mood] ?? 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* leaf sprout: perks up when happy, droops when sleepy */}
          <motion.g style={{ transformOrigin: "60px 22px" }} animate={{ rotate: L.leaf }} transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.5, bounce: 0.4 }}>
            <path d="M60 22 Q 61 12 66 6" stroke="#047857" strokeWidth={3} fill="none" strokeLinecap="round" />
            <path d="M66 6 C 74 -4 90 -2 94 4 C 86 12 74 14 66 6 Z" fill="#34d399" stroke="#059669" strokeWidth={1.5} />
            <path d="M68 6 Q 80 4 90 4" stroke="#059669" strokeWidth={1} fill="none" />
          </motion.g>
          {/* drop body */}
          <path d="M60 18 C 52 34 18 66 18 96 A 42 42 0 0 0 102 96 C 102 66 68 34 60 18 Z" fill="url(#dewyBody)" stroke="#2f6fd6" strokeWidth={2} />
          <ellipse cx={40} cy={78} rx={7} ry={14} fill="#ffffff" opacity={0.55} transform="rotate(20 40 78)" />
          {/* eyes */}
          <EyeShape cx={46} cy={98} kind={L.eye} scale={L.oddEye ? scale * 0.8 : scale} blink={blink} lx={lx} ly={ly} />
          <EyeShape cx={74} cy={98} kind={L.eye} scale={L.oddEye ? scale * 1.25 : scale} blink={blink} lx={lx} ly={ly} />
        </motion.g>
      </motion.g>
      <AnimatePresence>
        {L.fx && (
          <motion.g key={L.fx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Effect fx={L.fx} />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}

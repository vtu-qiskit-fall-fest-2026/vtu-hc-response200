/**
 * Five full-bleed background scenes for the Start screen, drawn as SVG by the
 * team (no photos, no brand marks, no licences to track). Light, pastel style so
 * the headline stays readable over them. Each scene keeps its detail on the
 * right half; the left half sits under the text card.
 */
import type { ReactNode } from "react";

const W = 1600, H = 900;

function Frame({ label, children, sky }: { label: string; children: ReactNode; sky: [string, string] }) {
  const id = label.replace(/\W+/g, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky${id})`} />
      {/* The art is drawn on the full canvas, then fitted into the top-right
          window that stays visible between the text card and the mini scene. */}
      <g transform="translate(523 30) scale(0.62)">{children}</g>
    </svg>
  );
}

/* 1 · server racks in a data hall */
function Racks() {
  const rack = (x: number, y: number, w: number, h: number, k: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.04} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
      {Array.from({ length: 9 }, (_, i) => {
        const yy = y + h * 0.06 + i * h * 0.1;
        return (
          <g key={i}>
            <rect x={x + w * 0.08} y={yy} width={w * 0.84} height={h * 0.075} rx={3} fill="#e2e8f0" />
            <circle cx={x + w * 0.16} cy={yy + h * 0.037} r={Math.max(2, w * 0.025)} fill={(i + k) % 4 === 0 ? "#2563eb" : "#10b981"} />
            <rect x={x + w * 0.3} y={yy + h * 0.03} width={w * 0.5} height={Math.max(1.5, h * 0.012)} fill="#94a3b8" />
          </g>
        );
      })}
    </g>
  );
  return (
    <Frame label="Rows of server racks in a data centre hall" sky={["#eef2f7", "#f8fafc"]}>
      {/* ceiling lights */}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={560 + i * 210} y={60} width={150} height={10} rx={5} fill="#ffffff" stroke="#e2e8f0" />)}
      {/* floor with perspective grid */}
      <path d="M0 640 L1600 640 L1600 900 L0 900 Z" fill="#e2e8f0" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={1050 + (i - 6) * 40} y1={640} x2={1050 + (i - 6) * 260} y2={900} stroke="#cbd5e1" strokeWidth={1.5} />)}
      {[680, 740, 820].map((y) => <line key={y} x1={0} y1={y} x2={1600} y2={y} stroke="#cbd5e1" strokeWidth={1.5} />)}
      {/* back row, small */}
      {Array.from({ length: 9 }, (_, i) => rack(700 + i * 92, 360, 80, 280, i))}
      {/* front row, large */}
      {Array.from({ length: 4 }, (_, i) => rack(820 + i * 190, 200, 170, 520, i + 2))}
      {/* cable tray */}
      <rect x={640} y={170} width={960} height={14} rx={4} fill="#cbd5e1" />
    </Frame>
  );
}

/* 2 · cooling towers with steam */
function Towers() {
  const tower = (cx: number, base: number, h: number, w: number) => (
    <g key={cx}>
      <path d={`M${cx - w / 2} ${base} C${cx - w * 0.28} ${base - h * 0.45} ${cx - w * 0.28} ${base - h * 0.65} ${cx - w * 0.34} ${base - h} L${cx + w * 0.34} ${base - h} C${cx + w * 0.28} ${base - h * 0.65} ${cx + w * 0.28} ${base - h * 0.45} ${cx + w / 2} ${base} Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
      <path d={`M${cx - w * 0.36} ${base - h * 0.2} L${cx + w * 0.36} ${base - h * 0.2}`} stroke="#cbd5e1" strokeWidth={2} />
      <ellipse cx={cx} cy={base - h} rx={w * 0.34} ry={10} fill="#cbd5e1" />
      {/* steam */}
      <g fill="#ffffff" opacity={0.95} filter="url(#steamBlur)">
        <circle cx={cx - w * 0.12} cy={base - h - 40} r={w * 0.2} />
        <circle cx={cx + w * 0.12} cy={base - h - 70} r={w * 0.24} />
        <circle cx={cx + w * 0.02} cy={base - h - 130} r={w * 0.28} opacity={0.9} />
        <circle cx={cx + w * 0.3} cy={base - h - 170} r={w * 0.22} opacity={0.75} />
      </g>
    </g>
  );
  return (
    <Frame label="Cooling towers releasing water as steam" sky={["#d6e6fa", "#f1f5f9"]}>
      <defs>
        <filter id="steamBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <path d="M0 700 Q 800 660 1600 700 L1600 900 L0 900 Z" fill="#dbe4ee" />
      {tower(980, 720, 330, 230)}
      {tower(1260, 730, 400, 270)}
      {tower(1500, 715, 300, 210)}
      {/* small data centre next to the towers */}
      <rect x={640} y={600} width={220} height={120} rx={6} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={660 + i * 50} y={625} width={34} height={70} rx={3} fill="#cbd5e1" />)}
      {/* water drops */}
      {[[1120, 780], [1180, 820], [1390, 800], [1060, 840]].map(([x, y]) => (
        <path key={`${x}`} d={`M${x} ${y - 18} q 12 16 0 26 q -12 -10 0 -26`} fill="#3b82f6" opacity={0.75} />
      ))}
    </Frame>
  );
}

/* 3 · power grid with solar and wind */
function Grid() {
  const pylon = (x: number, base: number, h: number) => (
    <g key={x} stroke="#64748b" strokeWidth={2.5} fill="none">
      <path d={`M${x - h * 0.16} ${base} L${x} ${base - h} L${x + h * 0.16} ${base}`} />
      <path d={`M${x - h * 0.13} ${base - h * 0.2} L${x + h * 0.1} ${base - h * 0.45} M${x + h * 0.13} ${base - h * 0.2} L${x - h * 0.1} ${base - h * 0.45} M${x - h * 0.08} ${base - h * 0.55} L${x + h * 0.06} ${base - h * 0.78}`} />
      <path d={`M${x - h * 0.2} ${base - h * 0.75} L${x + h * 0.2} ${base - h * 0.75} M${x - h * 0.15} ${base - h * 0.9} L${x + h * 0.15} ${base - h * 0.9}`} />
    </g>
  );
  const turbine = (x: number, base: number, h: number, a: number) => (
    <g key={x}>
      <line x1={x} y1={base} x2={x} y2={base - h} stroke="#94a3b8" strokeWidth={6} strokeLinecap="round" />
      {[0, 120, 240].map((r) => (
        <path key={r} d={`M${x} ${base - h} l -6 -${h * 0.45} q 6 -8 12 0 Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} transform={`rotate(${r + a} ${x} ${base - h})`} />
      ))}
      <circle cx={x} cy={base - h} r={8} fill="#94a3b8" />
    </g>
  );
  return (
    <Frame label="Power grid with pylons, solar panels and wind turbines" sky={["#fdf4e3", "#f8fafc"]}>
      <circle cx={1380} cy={170} r={80} fill="#fcd34d" opacity={0.85} />
      <path d="M0 680 Q 900 620 1600 670 L1600 900 L0 900 Z" fill="#dcfce7" />
      <path d="M0 760 Q 700 730 1600 760 L1600 900 L0 900 Z" fill="#d1fae5" />
      {turbine(1460, 680, 300, 10)}
      {turbine(1300, 660, 220, 50)}
      {pylon(820, 700, 330)}
      {pylon(1100, 690, 260)}
      <path d="M770 430 Q 950 500 1060 480 M870 430 Q 990 520 1140 480" stroke="#64748b" strokeWidth={1.5} fill="none" />
      {/* solar field */}
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <path key={`${r}-${c}`} d={`M${720 + c * 140 + r * 30} ${780 + r * 40} l 110 0 l 20 -30 l -110 0 Z`} fill="#1e40af" opacity={0.55 + r * 0.1} stroke="#93c5fd" strokeWidth={1.5} />
        )),
      )}
    </Frame>
  );
}

/* 4 · a generic dilution-refrigerator "chandelier" (unbranded) */
function Chandelier() {
  const tiers = [
    { y: 150, rx: 210 }, { y: 300, rx: 180 }, { y: 440, rx: 150 }, { y: 570, rx: 120 }, { y: 680, rx: 90 },
  ];
  const cx = 1150;
  return (
    <Frame label="Inside a quantum computer: gold cooling stages and cables" sky={["#f3f0fa", "#f8fafc"]}>
      <defs>
        <linearGradient id="gold" x1="0" x2="1">
          <stop offset="0" stopColor="#b7791f" />
          <stop offset="0.5" stopColor="#f6d38a" />
          <stop offset="1" stopColor="#b7791f" />
        </linearGradient>
        <radialGradient id="spot" cx="0.7" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#spot)" />
      {/* rods */}
      {[-0.7, -0.25, 0.25, 0.7].map((f) => (
        <line key={f} x1={cx + f * 200} y1={120} x2={cx + f * 85} y2={700} stroke="#c9a14a" strokeWidth={6} />
      ))}
      {/* coiled cables */}
      {[-0.45, 0, 0.45].map((f, i) => (
        <path key={f} d={`M${cx + f * 170} 160 C ${cx + f * 260} 230 ${cx + f * 60} 270 ${cx + f * 150} 320 S ${cx + f * 40} 420 ${cx + f * 120} 460 S ${cx + f * 30} 560 ${cx + f * 90} 600`}
          stroke={i === 1 ? "#b45309" : "#d97706"} strokeWidth={4} fill="none" opacity={0.8} />
      ))}
      {tiers.map((t) => (
        <g key={t.y}>
          <ellipse cx={cx} cy={t.y + 14} rx={t.rx} ry={24} fill="#a16207" />
          <ellipse cx={cx} cy={t.y} rx={t.rx} ry={24} fill="url(#gold)" />
        </g>
      ))}
      <rect x={cx - 22} y={690} width={44} height={70} rx={8} fill="url(#gold)" />
      <rect x={cx - 34} y={755} width={68} height={16} rx={4} fill="#475569" />
      <ellipse cx={cx} cy={830} rx={340} ry={26} fill="#e2e8f0" />
    </Frame>
  );
}

/* 5 · green data hall at sunrise */
function GreenHall() {
  return (
    <Frame label="A low data centre with a planted roof and solar panels at sunrise" sky={["#fde7d4", "#f8fafc"]}>
      <circle cx={1300} cy={600} r={150} fill="#fdba74" opacity={0.75} />
      <path d="M0 640 Q 800 600 1600 640 L1600 900 L0 900 Z" fill="#d1fae5" />
      {/* building */}
      <rect x={760} y={500} width={640} height={190} rx={10} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
      <path d="M750 500 Q 1080 455 1410 500 Z" fill="#34d399" />
      <path d="M760 500 L1400 500" stroke="#059669" strokeWidth={6} />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={790 + i * 75} y={540} width={50} height={110} rx={4} fill="#e2e8f0" />)}
      {/* rooftop solar */}
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={`M${830 + i * 110} 478 l 80 0 l 14 -22 l -80 0 Z`} fill="#1e40af" opacity={0.6} stroke="#93c5fd" />
      ))}
      {/* trees */}
      {[[700, 690, 60], [1450, 700, 70], [640, 710, 45], [1530, 715, 50]].map(([x, y, r]) => (
        <g key={x}>
          <rect x={x - 5} y={y - 10} width={10} height={40} fill="#a16207" opacity={0.7} />
          <circle cx={x} cy={y - r * 0.6} r={r} fill="#10b981" opacity={0.85} />
        </g>
      ))}
      <path d="M0 760 Q 800 740 1600 770 L1600 900 L0 900 Z" fill="#a7f3d0" opacity={0.6} />
    </Frame>
  );
}

export const SCENES = [
  { key: "racks", caption: "Servers never sleep", step: 0, View: Racks },
  { key: "towers", caption: "Cooling drinks water", step: 0, View: Towers },
  { key: "grid", caption: "Grid carbon changes hourly", step: 0, View: Grid },
  { key: "quantum", caption: "A quantum computer decides", step: 1, View: Chandelier },
  { key: "hall", caption: "Smarter placement, less impact", step: 2, View: GreenHall },
] as const;

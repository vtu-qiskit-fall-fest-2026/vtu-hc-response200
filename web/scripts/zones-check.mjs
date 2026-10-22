// Checks Dewy's spots for a few screen sizes (run by tests/test_dewy_zones.py).
// Node 22.6+ strips TypeScript types, so the zone rules are imported as-is.
import { spotsFor, spotRect, overlaps, LANE_PX } from "../src/components/mascot/zones.ts";

const SIDEBAR = 220, SIDEBAR_PHONE = 76, FOOTER = 60, PAD_RIGHT = 150; // canvas px (App.tsx / Shell.tsx)
const out = [];
for (const [w, h] of [[1920, 1080], [1366, 768], [1440, 900], [390, 844]]) {
  const compact = w < 1000;
  const s = compact ? 1 : Math.min(w / 1600, h / 900);
  const main = { left: (compact ? SIDEBAR_PHONE : SIDEBAR) * s, top: 0, right: w, bottom: h - FOOTER * s };
  const content = { ...main, right: main.right - (compact ? 16 : PAD_RIGHT * s) };
  const sidebar = { left: 0, top: 0, right: main.left, bottom: h };
  const footer = { left: main.left, top: main.bottom, right: w, bottom: h };
  for (const spot of spotsFor(main, { w, h }, s, compact)) {
    const r = spotRect(spot, s, compact);
    out.push({
      size: `${w}x${h}`, spot, compact,
      inViewport: r.left >= 0 && r.top >= 0 && r.right <= w && r.bottom <= h,
      clearOfSidebar: !overlaps(r, sidebar),
      clearOfFooter: compact || !overlaps(r, footer),
      clearOfContent: compact || !overlaps(r, content),
      inLane: compact || r.left >= main.right - LANE_PX * s - 0.5,
    });
  }
}
console.log(JSON.stringify(out));

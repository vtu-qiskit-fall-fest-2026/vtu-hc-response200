/**
 * Where Dewy may stand. Pure functions, no DOM, so they can be tested in Node
 * (web/scripts/zones-check.mjs, run by tests/test_dewy_zones.py).
 *
 * Desktop: the stage keeps a right-edge LANE (main's right padding) that no
 * widget, text, chart, slider or button ever enters. Dewy wanders only inside
 * that lane, and lines up with a widget by hopping to the widget's height.
 * Phones: one fixed spot above the footer, no wandering.
 */
export interface Rect { left: number; top: number; right: number; bottom: number }
export interface Spot { x: number; y: number } // top-left of Dewy's box, in viewport px

/** Lane width and Dewy's size in canvas px (the canvas is 1600x900; multiply by the stage scale). */
export const LANE_PX = 140;
export const DEWY_W = 104;          // body width; height is 1.25x
export const DEWY_W_PHONE = 60;
/** Fractions of the lane's free height used as wander spots, top to bottom. */
export const LANE_STOPS = [0, 0.32, 0.62, 1];

/** Default stop per screen (Start, Schedule, Quantum, Compare, Ask, About). */
export const HOME_STOP = [2, 3, 3, 3, 3, 3];

export function dewySize(scale: number, compact: boolean) {
  const w = (compact ? DEWY_W_PHONE : DEWY_W) * scale;
  return { w, h: w * 1.25 };
}

/** The lane: the right padding strip of the stage. */
export function laneRect(main: Rect, scale: number): Rect {
  return { left: main.right - LANE_PX * scale, top: main.top, right: main.right, bottom: main.bottom };
}

/** All spots Dewy may use on this screen. */
export function spotsFor(main: Rect, viewport: { w: number; h: number }, scale: number, compact: boolean): Spot[] {
  const { w, h } = dewySize(scale, compact);
  if (compact) {
    // phones: bottom-right, above the 60 px footer
    return [{ x: viewport.w - w - 10, y: viewport.h - h - 66 }];
  }
  const lane = laneRect(main, scale);
  const x = lane.left + (lane.right - lane.left - w) / 2;
  const top = lane.top + 10 * scale;
  const bottom = lane.bottom - h - 4 * scale;
  return LANE_STOPS.map((f) => ({ x, y: top + f * Math.max(0, bottom - top) }));
}

/** A spot in the lane at the height of a target rect (clamped to the lane). */
export function alignSpot(target: Rect, main: Rect, viewport: { w: number; h: number }, scale: number, compact: boolean): Spot {
  const spots = spotsFor(main, viewport, scale, compact);
  if (compact) return spots[0];
  const { h } = dewySize(scale, compact);
  const minY = spots[0].y, maxY = spots[spots.length - 1].y;
  const cy = (target.top + target.bottom) / 2 - h * 0.55;
  return { x: spots[0].x, y: Math.min(maxY, Math.max(minY, cy)) };
}

export const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
export const spotRect = (s: Spot, scale: number, compact: boolean): Rect => {
  const { w, h } = dewySize(scale, compact);
  return { left: s.x, top: s.y, right: s.x + w, bottom: s.y + h };
};

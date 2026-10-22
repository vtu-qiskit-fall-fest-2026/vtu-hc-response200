import { animate, motionValue, type MotionValue } from "motion/react";
import { alignSpot, dewySize, spotsFor, type Rect, type Spot } from "./zones";

/**
 * Dewy's movement controller, shared by the idle life, the page reactions, the
 * guided tour and the Demo Director. Everything is a Motion value, so moving
 * Dewy never re-renders React.
 *
 *   hopTo(spot | index)  curved hop with squash on take-off and landing
 *   alignWith(el)        hop up or down the lane to an element's height
 *   look(el | point)     eyes (and a small lean) toward something
 *   bounce(n)            hops in place (count-ups, gates lighting)
 *   wiggle() / spin()    small personality moments
 *   wander(on) / quiet(on)
 */
export type Scale = () => number;

export class DewyMotion {
  x = motionValue(0);
  y = motionValue(0);
  groundY = motionValue(0); // shadow follows the ground line under Dewy
  air = motionValue(0);     // 0 on the ground, 1 at the top of a hop
  sx = motionValue(1);
  sy = motionValue(1);
  rot = motionValue(0);
  lookX = motionValue(0);
  lookY = motionValue(0);

  moving = false;
  wandering = true;
  quietMode = false;
  reduced: boolean;
  screen = 0;
  current = 0; // index of the spot Dewy stands on
  onLand: () => void = () => {};
  onMovingChange: (moving: boolean) => void = () => {};

  private timers: number[] = [];
  private lastHop = 0;

  constructor(private scale: Scale, private compact: () => boolean, reduced: boolean) {
    this.reduced = reduced;
  }

  /* ------------------------------------------------------------ geometry */

  private main(): Rect {
    const m = document.querySelector("main")?.getBoundingClientRect();
    return m ? { left: m.left, top: m.top, right: m.right, bottom: m.bottom } : { left: 0, top: 0, right: innerWidth, bottom: innerHeight - 60 };
  }
  spots(): Spot[] {
    return spotsFor(this.main(), { w: innerWidth, h: innerHeight }, this.scale(), this.compact());
  }
  size() {
    return dewySize(this.scale(), this.compact());
  }
  center() {
    const { w, h } = this.size();
    return { cx: this.x.get() + w / 2, cy: this.y.get() + h / 2 };
  }

  /** Put Dewy on a spot with no animation (first paint, resize, reduced motion). */
  place(i = this.current) {
    const s = this.spots();
    const p = s[Math.min(i, s.length - 1)];
    this.current = Math.min(i, s.length - 1);
    for (const v of [this.x, this.y, this.groundY, this.air, this.sx, this.sy, this.rot]) v.stop();
    this.x.set(p.x);
    this.y.set(p.y);
    this.groundY.set(p.y);
    this.air.set(0);
    this.sx.set(1);
    this.sy.set(1);
  }

  /* ------------------------------------------------------------ moves */

  async hopTo(target: Spot | number, opts: { arc?: number } = {}) {
    const spots = this.spots();
    const p = typeof target === "number" ? spots[Math.max(0, Math.min(target, spots.length - 1))] : target;
    if (typeof target === "number") this.current = Math.max(0, Math.min(target, spots.length - 1));
    if (this.reduced || this.compact()) {
      this.x.set(p.x); this.y.set(p.y); this.groundY.set(p.y);
      return;
    }
    const x0 = this.x.get(), y0 = this.y.get();
    const dist = Math.hypot(p.x - x0, p.y - y0);
    if (dist < 2) return this.bounce(1);
    const s = this.scale();
    const dur = Math.min(1.1, Math.max(0.55, 0.45 + dist / (1500 * s)));
    const arc = (opts.arc ?? Math.min(130, 46 + dist * 0.22 / s)) * s;
    this.setMoving(true);
    // take-off squash
    animate(this.sx, 1.14, { duration: 0.11 });
    await animate(this.sy, 0.8, { duration: 0.11 });
    // flight: stretch, arc up then down, shadow slides along the ground
    animate(this.sx, 0.93, { duration: 0.18 });
    animate(this.sy, 1.1, { duration: 0.18 });
    animate(this.groundY, p.y, { duration: dur, ease: "easeInOut" });
    animate(this.air, [0, 1, 0], { duration: dur, times: [0, 0.45, 1] });
    animate(this.x, p.x, { duration: dur, ease: [0.45, 0, 0.35, 1] });
    await animate(this.y, [y0, Math.max(4, Math.min(y0, p.y) - arc), p.y], { duration: dur, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] });
    // landing: squash, splash, spring back
    this.onLand();
    animate(this.sx, [1.18, 0.96, 1], { duration: 0.42, ease: "easeOut" });
    await animate(this.sy, [0.74, 1.06, 1], { duration: 0.42, ease: "easeOut" });
    this.lastHop = performance.now();
    this.setMoving(false);
  }

  /** Hop up or down the lane to line up with an element (or a rect). */
  alignWith(target: Element | Rect | string | null) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return Promise.resolve();
    const r = el instanceof Element ? el.getBoundingClientRect() : el;
    const spot = alignSpot({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }, this.main(), { w: innerWidth, h: innerHeight }, this.scale(), this.compact());
    this.look(el instanceof Element ? el : null);
    return this.hopTo(spot);
  }

  /** Small hops in place. */
  async bounce(n = 1, height = 16) {
    if (this.reduced || this.moving) return;
    const s = this.scale();
    const y0 = this.y.get();
    for (let i = 0; i < n; i++) {
      animate(this.sy, [0.86, 1.08, 1], { duration: 0.34 });
      animate(this.air, [0, 0.4, 0], { duration: 0.34 });
      await animate(this.y, [y0, Math.max(4, y0 - height * s), y0], { duration: 0.34, ease: "easeOut" });
    }
  }

  wiggle() {
    if (this.reduced) return;
    animate(this.rot, [0, -9, 8, -5, 3, 0], { duration: 0.8 });
  }
  spin() {
    if (this.reduced) return;
    animate(this.rot, [0, 360], { duration: 0.7, ease: "easeInOut" }).then(() => this.rot.set(0));
  }
  tilt(deg: number) {
    if (this.reduced) return;
    animate(this.rot, deg, { type: "spring", visualDuration: 0.3, bounce: 0.3 });
  }

  /** Eyes toward an element or a viewport point; null looks straight ahead. */
  look(target: Element | { x: number; y: number } | null) {
    if (!target) {
      animate(this.lookX, 0, { duration: 0.3 });
      animate(this.lookY, 0, { duration: 0.3 });
      return;
    }
    let tx: number, ty: number;
    if (target instanceof Element) {
      const r = target.getBoundingClientRect();
      tx = r.left + r.width / 2; ty = r.top + r.height / 2;
    } else { tx = target.x; ty = target.y; }
    const { cx, cy } = this.center();
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1;
    this.lookX.set(dx / d);
    this.lookY.set(dy / d);
  }

  /* ------------------------------------------------------------ idle life */

  /** Starts the idle loop: hops in place, wandering, small personality moments. */
  startIdle(canWander: () => boolean) {
    this.stopIdle();
    if (this.reduced || this.compact()) return;
    const tick = () => {
      const delay = 3000 + Math.random() * 3000;
      this.timers.push(window.setTimeout(() => {
        if (!document.hidden && !this.moving && !this.quietMode) {
          const since = performance.now() - this.lastHop;
          if (this.wandering && canWander() && since > 6000 && Math.random() < 0.55) {
            const spots = this.spots();
            const choices = spots.map((_, i) => i).filter((i) => i !== this.current);
            void this.hopTo(choices[Math.floor(Math.random() * choices.length)]);
          } else {
            const r = Math.random();
            if (r < 0.12) this.spin();
            else if (r < 0.3) this.wiggle();
            else void this.bounce(1, 10);
          }
        }
        tick();
      }, delay));
    };
    tick();
  }
  stopIdle() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }

  private setMoving(m: boolean) {
    this.moving = m;
    this.onMovingChange(m);
  }
}

export type DewyMotionValues = Pick<DewyMotion, "x" | "y" | "sx" | "sy" | "rot" | "lookX" | "lookY" | "air" | "groundY">;
export type { MotionValue };

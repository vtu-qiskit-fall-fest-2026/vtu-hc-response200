import { Atom, CalendarClock, Home, Info, MessageCircle, Scale, type LucideIcon } from "lucide-react";

export type ScreenKey = "start" | "schedule" | "quantum" | "compare" | "ask" | "about";

export const SCREENS: { key: ScreenKey; label: string; Icon: LucideIcon }[] = [
  { key: "start", label: "Start", Icon: Home },
  { key: "schedule", label: "Schedule", Icon: CalendarClock },
  { key: "quantum", label: "Quantum", Icon: Atom },
  { key: "compare", label: "Compare", Icon: Scale },
  { key: "ask", label: "Ask", Icon: MessageCircle },
  { key: "about", label: "About", Icon: Info },
];

const KEY = "greenq.screen";

/** Last screen, remembered per browser. Storage can be blocked, so never throw. */
export function loadScreen(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isInteger(v) && v >= 0 && v < SCREENS.length ? v : 0;
  } catch {
    return 0;
  }
}

export function saveScreen(i: number) {
  try {
    window.localStorage.setItem(KEY, String(i));
  } catch {
    /* private window or blocked storage: nothing to remember */
  }
}

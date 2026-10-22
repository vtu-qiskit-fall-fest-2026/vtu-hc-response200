import { useEffect, useState } from "react";

/** Where a piece of explanation text came from. "template" = fixed rules, no model. */
export type Source = "live" | "cached" | "template";

async function post<T>(url: string, body: unknown, timeoutMs = 9000): Promise<T> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * "Why this schedule" lines for a preset and priority. The server answers from
 * the cache or a template, or live from the model; if the server can't be
 * reached the caller's own template lines are shown. Never throws.
 */
export function useExplain(preset: string, w: number, fallback: string[]) {
  const [state, setState] = useState<{ key: string; lines: string[]; source: Source } | null>(null);
  const key = `${preset}:${w}`;
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      post<{ lines: string[]; source: Source }>("/api/explain", { preset, w })
        .then((r) => alive && setState({ key, lines: r.lines, source: r.source }))
        .catch(() => alive && setState(null));
    }, 250); // the slider sweeps quickly in story mode
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (state && state.key === key) return { lines: state.lines, source: state.source };
  return { lines: fallback, source: "template" as Source };
}

export interface AskReply { text: string; source: Source; focus: string | null; screen: number | null }

export async function ask(question: string, preset: string, w: number): Promise<AskReply> {
  try {
    return await post<AskReply>("/api/ask", { question, preset, w }, 12000);
  } catch {
    return { text: "I can't reach the GreenQ server right now. Try one of the example questions.", source: "template", focus: null, screen: null };
  }
}

/** Narration lines for story mode (pre-generated); empty if unavailable. */
export function useNarration() {
  const [lines, setLines] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/narration")
      .then((r) => (r.ok ? (r.json() as Promise<{ lines?: Record<string, string> }>) : {}))
      .then((d: { lines?: Record<string, string> }) => setLines(d.lines ?? {}))
      .catch(() => setLines({}));
  }, []);
  return lines;
}

export interface ParsedJob { name: string; kwh: number; home_site: "evap" | "air"; submitted_slot: "day" | "night"; deadline: boolean; residency: boolean }

/** Plain-English job description -> validated job table (or null -> show the form). */
export async function parseJobs(text: string): Promise<{ jobs: ParsedJob[] | null; note: string; source: Source }> {
  try {
    return await post<{ jobs: ParsedJob[] | null; note: string; source: Source }>("/api/parse-jobs", { text }, 15000);
  } catch {
    return { jobs: null, note: "Couldn't read jobs from that text right now, so here is the form instead.", source: "template" };
  }
}

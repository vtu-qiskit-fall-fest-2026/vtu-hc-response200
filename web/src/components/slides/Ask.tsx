import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Loader2, Send, Wand2 } from "lucide-react";
import { useApp } from "@/lib/data";
import { ask, parseJobs, type AskReply } from "@/lib/llm";
import { SCREENS } from "@/lib/screens";
import { AnnualImpact, YourJobs, type JobIn } from "@/components/proof/TryIt";
import { Badge, Card, Info, Screen, Segmented } from "./ui";
import { useMascot } from "@/components/mascot/MascotProvider";

/** The five preset questions; their answers are pre-generated in results/llm_cache.json. */
export const EXAMPLES = [
  "Why did video rendering move?",
  "What if only water matters?",
  "How do I know the quantum part is real?",
  "Is this faster than a laptop?",
  "What are the limits?",
];

type Turn = { q: string; a: AskReply | null };

/** First sentence of an answer, for Dewy's one-line bubble (the full answer stays in the chat). */
const firstSentence = (t: string) => {
  const s = t.split(/(?<=[.!?])\s+/)[0] ?? t;
  return s.length > 120 ? `${s.slice(0, 117).trimEnd()}…` : s;
};

function Chat() {
  const { preset, stop, show, demo } = useApp();
  const mascot = useMascot();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const busy = turns.some((t) => t.a === null);
  const send = async (q: string) => {
    const question = q.trim().slice(0, 300);
    if (!question || busy) return;
    setText("");
    setTurns((ts) => [...ts.slice(-2), { q: question, a: null }]);
    mascot.setMood("thinking");
    mascot.point("[data-widget=chat]");
    const a = await ask(question, preset.key, stop.w, !!demo);
    if (a.failed) {
      mascot.setMood("confused", { for: 2200 });
      mascot.say("I'm offline, but the example questions still work.", { ms: 4000 });
    } else {
      mascot.setMood("excited", { for: 1600 });
      mascot.say(firstSentence(a.text), { ms: 6500, badge: a.source === "template" ? "template" : "ai" });
    }
    mascot.point(null);
    setTurns((ts) => ts.map((t) => (t.q === question && t.a === null ? { q: t.q, a } : t)));
  };
  return (
    <Card id="chat" className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1 text-[18px] font-semibold">
          Ask about this plan
          <Info>Answers use only GreenQ&rsquo;s saved results. The model never changes the schedule; any number it can&rsquo;t match to the data is removed.</Info>
        </h2>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button key={q} disabled={busy} onClick={() => send(q)}
            className="rounded-full bg-muted px-3.5 py-1.5 text-[14px] font-medium transition-colors hover:bg-foreground hover:text-white disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden" aria-live="polite">
        <AnimatePresence initial={false}>
          {turns.map((t) => (
            <motion.div key={t.q} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2 text-[15px] text-white">{t.q}</p>
              <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-[15px] leading-snug">
                {t.a === null ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking the saved results…</span>
                ) : (
                  <>
                    <p className="line-clamp-6">{t.a.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge kind={t.a.source === "template" ? "template" : "ai"} label={t.a.source === "live" ? "AI explanation · live" : undefined} />
                      {t.a.screen !== null && t.a.focus && (
                        <button onClick={() => show(t.a!.screen!, t.a!.focus!)} className="flex items-center gap-1 text-[13px] font-semibold text-violet-700 hover:underline">
                          Show me on {SCREENS[t.a.screen].label} <ArrowRight className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {turns.length === 0 && <p className="text-[15px] text-muted-foreground">Pick a question, or type your own.</p>}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Ask about where, when, carbon or water…" aria-label="Your question"
          className="min-w-0 flex-1 rounded-xl bg-muted px-4 py-2.5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <button disabled={busy || !text.trim()} className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-[15px] font-medium text-white disabled:opacity-40" aria-label="Send">
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </Card>
  );
}

/** Plain English -> validated jobs -> live simulator. Falls back to the form. */
function Describe() {
  const { demo } = useApp();
  const [text, setText] = useState("Train a 1000 kWh model at Site A, it can run any time. Nightly backup of 300 kWh at Site B that must stay there. A 700 kWh report at Site A due by end of day.");
  const [state, setState] = useState<"idle" | "busy" | "done" | "fallback">("idle");
  const [jobs, setJobs] = useState<JobIn[] | null>(null);
  const [note, setNote] = useState("");
  const [by, setBy] = useState<"live" | "cached" | "template">("template");
  const run = useRef(0);
  const go = async () => {
    setState("busy");
    const r = await parseJobs(text, !!demo);
    run.current += 1;
    setJobs(r.jobs);
    setNote(r.note);
    setBy(r.source);
    setState(r.jobs && r.jobs.length ? "done" : "fallback");
  };
  if (state === "done" && jobs) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
            {by === "template" ? <Badge kind="template" label="Read by simple rules" /> : <Badge kind="ai" label="Read by AI" />}
            Check the table; edit anything. {note}
          </p>
          <button onClick={() => setState("idle")} className="text-[13px] font-semibold text-violet-700 hover:underline">Edit text</button>
        </div>
        <YourJobs key={run.current} initial={jobs} autoRun />
      </div>
    );
  }
  if (state === "fallback") {
    return (
      <div className="flex h-full flex-col gap-3">
        <p className="rounded-xl bg-muted px-3 py-2 text-[14px] text-muted-foreground">{note || "Couldn't read jobs from that text, so here is the form instead."}</p>
        <YourJobs key={run.current} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3">
      <label className="text-[14px] font-medium" htmlFor="describe">Describe up to 5 jobs: size in kWh, home site, any deadline or rule.</label>
      <textarea id="describe" value={text} onChange={(e) => setText(e.target.value.slice(0, 800))} rows={5}
        className="min-h-0 w-full flex-1 resize-none rounded-2xl bg-muted p-4 text-[15px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">The model only fills in the table. The schedule is solved by brute force and the simulator.</p>
        <button data-demo="read-jobs" disabled={state === "busy" || text.trim().length < 8} onClick={go}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[15px] font-medium text-white disabled:opacity-40">
          {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Wand2 className="size-4" aria-hidden="true" />} Read my jobs
        </button>
      </div>
    </div>
  );
}

type Tab = "describe" | "form" | "fleet";

export function AskScreen() {
  const [tab, setTab] = useState<Tab>("describe");
  return (
    <Screen title="Ask GreenQ." info="An AI explains the saved results in plain words. It never decides the schedule and never invents numbers.">
      <div className="grid h-full grid-cols-[1fr_1.05fr] gap-5">
        <Chat />
        <Card id="try" className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <Segmented label="Try it" value={tab} onChange={setTab} options={[
              { value: "describe", label: "Describe your jobs" },
              { value: "form", label: "Form" },
              { value: "fleet", label: "Fleet impact" },
            ]} />
            {tab === "fleet" ? <Badge kind="illustrative" label="Assumptions" /> : <Badge kind="live" />}
          </div>
          <div className="mt-4 min-h-0 flex-1">
            {tab === "describe" && <Describe />}
            {tab === "form" && <YourJobs />}
            {tab === "fleet" && <AnnualImpact />}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

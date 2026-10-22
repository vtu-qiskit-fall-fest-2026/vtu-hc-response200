import { Dewy, MOODS } from "./Dewy";

/** Every mood side by side, for docs and checks. Open http://127.0.0.1:8000/#dewy-moods */
export function MoodGallery() {
  return (
    <main className="grid min-h-dvh grid-cols-6 place-items-center gap-6 bg-white p-10">
      {MOODS.map((m) => (
        <figure key={m} className="flex flex-col items-center gap-2">
          <Dewy mood={m} size={120} />
          <figcaption className="font-mono text-[14px] text-muted-foreground">{m}</figcaption>
        </figure>
      ))}
    </main>
  );
}

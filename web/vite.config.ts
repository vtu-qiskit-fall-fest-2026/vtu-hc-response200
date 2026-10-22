import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The slide app is designed on a 1600×900 canvas and scaled to the screen by
 * changing the root font size (see src/lib/stage.ts). For that to work every
 * CSS length must be in rem, so this turns px (above 1px) into rem in the built
 * CSS. Text inside SVGs keeps px, because SVGs already scale with their viewBox.
 * We don't use CSS zoom or transform: scale, because both throw off Motion's
 * layout animations (the moving job blocks).
 */
function pxToRem(): Plugin {
  // Skip px inside escaped class names such as .text-\[13px\] or .shadow-\[0_8px_...\]:
  // there the px is followed by "\" or "_", never in a declaration value.
  const toRem = (css: string) =>
    css.replace(/(-?\d*\.?\d+)px(?![\\_\w])/g, (m, n) => (Math.abs(Number(n)) <= 1 ? m : `${+(Number(n) / 16).toFixed(5)}rem`));
  return {
    name: "greenq-px-to-rem",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const f of Object.values(bundle)) {
        if (f.type !== "asset" || !f.fileName.endsWith(".css")) continue;
        const src = String(f.source);
        const svgText = [...src.matchAll(/\.text-\\\[(\d+(?:\.\d+)?)px\\\]/g)].map((m) => m[1]);
        const keep = [...new Set(svgText)].map((n) => `svg .text-\\[${n}px\\]{font-size:${n}px}`).join("");
        f.source = toRem(src) + keep;
      }
    },
  };
}

// In development (`npm run dev`) API calls go to the FastAPI server on :8000.
// Note: px-to-rem runs on builds only, so check slide fit with `npm run build`.
export default defineConfig({
  plugins: [react(), tailwindcss(), pxToRem()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});

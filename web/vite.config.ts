import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development (`npm run dev`) API calls go to the FastAPI server on :8000.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});

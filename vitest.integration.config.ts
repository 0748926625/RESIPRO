import path from "node:path";

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// loadEnv always reads .env.local regardless of mode, so this picks up the same
// credentials `next dev`/`next build` use — no separate secrets file or dotenv
// dependency needed.
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

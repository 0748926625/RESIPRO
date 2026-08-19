import path from "node:path";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// Integration tests (tests/integration/**) hit the real Supabase project and are run
// separately via `npm run test:integration` (see vitest.integration.config.ts) — kept
// out of the default `npm test` run so it stays fast and credential-free.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/integration/**"],
  },
});

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Resolve the "@/..." import alias the app uses (mirrors tsconfig paths).
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Scoped to the logic files we deliberately unit-test (Tier 1). Presentational
      // components, static knowledge content, and framework glue are intentionally not
      // unit-tested — runtime behavior is covered by the eval suite (npm run eval).
      include: ["src/app/api/chat/route.ts", "src/lib/openrouter.ts"],
      reporter: ["text", "text-summary"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});

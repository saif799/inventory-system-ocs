import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // No real Postgres is ever dialed: lib/db.ts constructs its client eagerly
    // at import time, so this only needs to look like a connection string.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

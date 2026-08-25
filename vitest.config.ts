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
    // Each test spins up its own PGlite instance (createTestDb); with several
    // suites' files running in parallel that schema push can take well past
    // the 5s/10s defaults under CPU contention.
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // See tests/stubs/server-only.ts.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});

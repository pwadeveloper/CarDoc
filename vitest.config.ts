import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      // Node 25's native localStorage masks jsdom's browser storage.
      forks: { execArgv: ["--no-experimental-webstorage"] },
    },
  },
});

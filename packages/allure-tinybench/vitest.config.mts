import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});

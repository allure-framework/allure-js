import { defineConfig } from "vite-plus";

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

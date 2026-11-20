import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    fileParallelism: false,
    testTimeout: 25000,
    reporters: ["default"],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.typecheck.json",
    },
  },
});

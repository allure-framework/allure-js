import { defineConfig } from "vite";
import { AllureReporter } from "./src/index";

export default defineConfig({
  test: {
    reporters: [new AllureReporter({}), "dot"],
    watch: false,
  },
});

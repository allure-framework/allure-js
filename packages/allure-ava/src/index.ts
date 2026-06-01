import { installAllureAva } from "./patch.js";
import type { AllureAvaPatchConfig, AllureAvaReporterConfig } from "./types.js";

export type { AllureAvaPatchConfig, AllureAvaReporterConfig };
export { installAllureAva };

export const installAllure = async (reporterConfig: AllureAvaReporterConfig = {}) =>
  installAllureAva({ reporterConfig });

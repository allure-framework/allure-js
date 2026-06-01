import { importAvaLib } from "./avaInternals.js";
import { AllureAvaReporter } from "./reporter.js";
import type { AllureAvaPatchConfig, AvaStateChangeEvent } from "./types.js";

const PATCHED = Symbol.for("allure-ava.patched-api-run");
const DEFAULT_SETUP_MODULE = "allure-ava/setup";

type AvaRunPlan = {
  status?: {
    on?: (eventName: string, listener: (payload: any) => void) => (() => void) | unknown;
  };
};

type AvaApiPrototype = {
  run: (...args: any[]) => Promise<any>;
  [PATCHED]?: boolean;
};

type AvaApiConstructor = {
  default: {
    prototype: AvaApiPrototype;
  };
};

const unwrapEmitteryPayload = <T>(payload: T | { data: T }): T =>
  payload && typeof payload === "object" && "data" in payload ? (payload as { data: T }).data : (payload as T);

const normalizeRequireEntry = (entry: unknown): unknown[] => (Array.isArray(entry) ? entry : [entry]);

const hasSetupModule = (entries: unknown[], setupModule: string) =>
  entries.map(normalizeRequireEntry).some(([ref]) => typeof ref === "string" && ref === setupModule);

const ensureSetupModule = (options: { require?: unknown[] }, setupModule: string) => {
  const entries = Array.isArray(options.require) ? options.require : options.require ? [options.require] : [];

  if (hasSetupModule(entries, setupModule)) {
    return;
  }

  options.require = [[setupModule], ...entries.map(normalizeRequireEntry)];
};

export const installAllureAva = async ({
  reporterConfig,
  setupModule = DEFAULT_SETUP_MODULE,
}: AllureAvaPatchConfig = {}) => {
  const { default: AvaApi } = await importAvaLib<AvaApiConstructor>("lib", "api.js");
  const prototype = AvaApi.prototype;

  if (prototype[PATCHED]) {
    return;
  }

  // AVA has no reporter plugin API. This wrapper stays at the run boundary:
  // inject worker setup, then observe AVA's own state-change stream.
  const originalRun = prototype.run;

  prototype.run = async function allureAvaRun(
    this: { options?: { require?: unknown[] }; on?: Function },
    ...args: any[]
  ) {
    if (this.options) {
      ensureSetupModule(this.options, setupModule);
    }

    let reporter: AllureAvaReporter | undefined;
    const unsubscribe = this.on?.("run", (payload: any) => {
      const plan = unwrapEmitteryPayload<AvaRunPlan>(payload);

      reporter = new AllureAvaReporter(reporterConfig);
      plan.status?.on?.("stateChange", (statePayload: any) => {
        reporter?.consumeStateChange(unwrapEmitteryPayload<AvaStateChangeEvent>(statePayload));
      });
    });

    try {
      return await originalRun.apply(this, args);
    } finally {
      reporter?.endRun();
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    }
  };

  prototype[PATCHED] = true;
};

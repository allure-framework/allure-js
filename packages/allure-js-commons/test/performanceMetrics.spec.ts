import { afterEach, describe, expect, it, vi } from "vitest";

import { getGlobalTestRuntime } from "../src/sdk/runtime/index.js";
import { NOOP_RUNTIME_WARNING } from "../src/sdk/runtime/NoopTestRuntime.js";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "allureTestRuntime");
});

describe("performance metrics no-op runtime", () => {
  it("uses the standard missing-runtime behavior", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await getGlobalTestRuntime().performanceMetrics({
      id: "metric-id",
      key: "report.generate",
      value: 12.5,
      start: 100,
      stop: 112.5,
    });

    expect(consoleLog).toHaveBeenCalledWith(NOOP_RUNTIME_WARNING);
  });
});

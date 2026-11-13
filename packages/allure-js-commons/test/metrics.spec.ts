import { afterEach, describe, expect, it, vi } from "vitest";

import { metric } from "../src/index.js";
import { NOOP_RUNTIME_WARNING } from "../src/sdk/runtime/NoopTestRuntime.js";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "allureTestRuntime");
});

describe("metrics no-op runtime", () => {
  it("uses the standard missing-runtime behavior", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await metric("report.generate", 12.5);

    expect(consoleLog).toHaveBeenCalledWith(NOOP_RUNTIME_WARNING);
  });
});

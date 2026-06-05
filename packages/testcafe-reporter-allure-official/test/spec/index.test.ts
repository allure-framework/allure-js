import { describe, expect, it } from "vitest";

import { createAllureTestCafeReporter } from "../../src/index.js";

describe("createAllureTestCafeReporter", () => {
  it("returns a plugin object when called with no arguments", () => {
    const result = createAllureTestCafeReporter();
    expect(typeof result).toBe("object");
    expect(typeof result.reportTaskDone).toBe("function");
  });

  it("returns a plugin object when called with undefined (as TestCafe string-name loader does)", () => {
    const result = createAllureTestCafeReporter(undefined as any);
    expect(typeof result).toBe("object");
    expect(typeof result.reportTaskDone).toBe("function");
  });

  it("returns a factory function when called with a config object", () => {
    const result = createAllureTestCafeReporter({});
    expect(typeof result).toBe("function");
  });
});

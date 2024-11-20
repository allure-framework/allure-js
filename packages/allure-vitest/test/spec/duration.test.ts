import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("test timings", () => {
  it("should set correct timings for tests", async () => {
    const before = new Date().getTime();
    const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(1);
    });
  `);
    const after = new Date().getTime();

    expect(tests).toHaveLength(1);
    const [tr] = tests;

    expect(tr.start).toBeGreaterThanOrEqual(before);
    expect(tr.start).toBeLessThanOrEqual(after);
    expect(tr.stop).toBeGreaterThanOrEqual(tr.start!);
  });

  it("should set integer timings for tests", async () => {
    const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(1);
    });
  `);

    expect(tests).toHaveLength(1);
    const [tr] = tests;

    expect(tr.start).toStrictEqual(Math.trunc(tr.start!));
    expect(tr.stop).toStrictEqual(Math.trunc(tr.stop!));
  });
});

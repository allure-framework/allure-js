import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

describe("test timings", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("should set correct timings for tests", async () => {
      const before = new Date().getTime();
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(1);
    });
  `,
      });
      const after = new Date().getTime();

      expect(tests).toHaveLength(1);
      const [tr] = tests;

      expect(tr.start).toBeGreaterThanOrEqual(before);
      expect(tr.start).toBeLessThanOrEqual(after);
      expect(tr.stop).toBeGreaterThanOrEqual(tr.start!);
    });

    it("should set integer timings for tests", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(1);
    });
  `,
      });

      expect(tests).toHaveLength(1);
      const [tr] = tests;

      expect(tr.start).toStrictEqual(Math.trunc(tr.start!));
      expect(tr.stop).toStrictEqual(Math.trunc(tr.stop!));
    });
  });
});

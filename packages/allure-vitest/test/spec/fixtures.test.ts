import { Status } from "allure-js-commons";
import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

describe("fixtures", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("should report fixtures", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { afterAll, afterEach, beforeAll, beforeEach, test } from "vitest";
    import { step } from "allure-js-commons";

    beforeAll(async () => {
      await step("before all step", () => {});
    });

    afterAll(async () => {
      await step("after all step", () => {});
    });

    beforeEach(async () => {
      await step("before each step", () => {});
    });

    afterEach(async () => {
      await step("after each step", () => {});
    });

    test("sample test", async () => {
      await step("test step", () => {});
    });
  `,
      });

      expect(tests).toHaveLength(1);
      const [testResult] = tests;
      expect(testResult.steps).toEqual([
        expect.objectContaining({
          name: "before all step",
        }),
        expect.objectContaining({
          name: "before each step",
        }),
        expect.objectContaining({
          name: "test step",
        }),
        expect.objectContaining({
          name: "after each step",
        }),
        expect.objectContaining({
          name: "after all step",
        }),
      ]);
    });

    it("should report failed hooks as global errors", async () => {
      const { tests, globals } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { afterAll, afterEach, beforeAll, beforeEach, describe, test } from "vitest";

    describe("outer", () => {
      describe("suite hooks", () => {
        beforeAll(() => {
          throw new Error("");
        });

        afterAll(() => {
          throw new Error("afterAll boom");
        });

        test("skipped by beforeAll", () => {});
      });

      describe("test hooks", () => {
        beforeEach(() => {
          throw new Error("beforeEach boom");
        });

        afterEach(() => {
          throw new Error("afterEach boom");
        });

        test("blocked by setup and cleanup", () => {});
      });

      describe("test body and cleanup", () => {
        afterEach(() => {
          throw new Error("cleanup after body");
        });

        test("body fails too", () => {
          throw new Error("body exploded");
        });
      });
    });
  `,
      });
      const allErrors = Object.values(globals ?? {}).flatMap((info) => info.errors);

      expect(tests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "blocked by setup and cleanup",
            status: Status.BROKEN,
          }),
          expect.objectContaining({
            name: "body fails too",
            status: Status.BROKEN,
          }),
        ]),
      );
      expect(allErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "beforeAll hook failed",
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            message: "beforeEach hook failed: beforeEach boom",
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            message: "afterEach hook failed: afterEach boom",
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            message: "afterAll hook failed: afterAll boom",
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            message: "afterEach hook failed: cleanup after body",
            timestamp: expect.any(Number),
          }),
        ]),
      );
      expect(allErrors.filter((error) => error.message === "beforeAll hook failed")).toHaveLength(1);
      expect(allErrors.filter((error) => error.message === "beforeEach hook failed: beforeEach boom")).toHaveLength(1);
      expect(allErrors.filter((error) => error.message === "afterEach hook failed: afterEach boom")).toHaveLength(1);
      expect(allErrors.filter((error) => error.message === "afterAll hook failed: afterAll boom")).toHaveLength(1);
      expect(allErrors.filter((error) => error.message === "afterEach hook failed: cleanup after body")).toHaveLength(
        1,
      );
      expect(allErrors.some((error) => error.message?.includes("body exploded"))).toBe(false);
    });
  });
});

import { beforeAll, beforeEach, describe, expect, it, test } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("simple", () => {
  for (const env of ["node", "browser"]) {
    describe(`test status for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("should report passed test", async () => {
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
        expect(tests[0].status).toBe(Status.PASSED);
      });

      it("should report failed test", async () => {
        const { tests } = await runVitestInlineTest({
          "sample.test.ts": `
        import { test, expect } from "vitest";

        test("sample test", async () => {
          expect(1).toBe(2);
        });
      `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].status).toBe(Status.FAILED);
      });

      it("should report broken test", async () => {
        const { tests } = await runVitestInlineTest({
          "sample.test.ts": `
        import { test, expect } from "vitest";

        test("sample test", async () => {
          throw new Error("broken");
        });
      `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].status).toBe(Status.BROKEN);
      });

      it("should report manually skipped tests", async () => {
        const { tests } = await runVitestInlineTest({
          "sample.test.ts": `
        import { test } from "vitest";

        test("skipped", (ctx) => {
          ctx.skip();
        })
        `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].status).toBe(Status.SKIPPED);
        expect(tests[0].stage).toBe(Stage.PENDING);
      });

      it("shouldn't report skipped tests and suites", async () => {
        const { tests } = await runVitestInlineTest({
          "sample.test.ts": `
        import { describe, test } from "vitest";

        test.skip("skipped", () => {})

        describe.skip("skipped", () => {
          test("not skipped", () => {})
        })
        `,
        });

        expect(tests).toHaveLength(0);
      });
    });
  }
});

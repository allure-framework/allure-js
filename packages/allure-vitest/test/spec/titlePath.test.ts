import { beforeAll, describe, expect, it } from "vitest";
import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("title path", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("should assign titlePath property to the test result", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "foo/bar/sample.test.ts": `
        import { expect, it } from "vitest";

        it("should pass", () => {
          expect(true).toBe(true);
        });
     `,
        });

        expect(tests).toHaveLength(1);

        const [tr] = tests;

        expect(tr.titlePath).toEqual(["foo", "bar", "sample.test.ts"]);
      });

      it("should assign titlePath property to the test result with suites", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "foo/bar/sample.test.ts": `
        import { describe, expect, it } from "vitest";

        describe("foo", () => {
          describe("bar", () => {
            it("should pass", () => {
              expect(true).toBe(true);
            });
          });
        });
      `,
        });

        expect(tests).toHaveLength(1);

        const [tr] = tests;

        expect(tr.titlePath).toEqual(["foo", "bar", "sample.test.ts", "foo", "bar"]);
      });
    });
  }
});

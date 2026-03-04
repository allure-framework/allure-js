import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("test plan", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("should support test plan", async () => {
        const { tests } = await runVitestInlineTest(
          {
            "vitest.config.ts": configFileAccessor,
            "foo/sample.test.ts": `
          import { test, describe } from "vitest";

          test("foo", () => {});

          test("bar", () => {});

          test("baz @allure.id=2", () => {});

          test("beep @allure.id=3", () => {});

          describe("foo", () => {
            describe("bar", () => {
              test("boop", () => {});
            });
          });

          export const testFixture = test.extend({
          dummy: async ({}, use) => {
            await use("fixture data");
          },
          });

          testFixture("fixture test", async ({ dummy }) => {
            await logStep(dummy);
          });
        `,
            "testplan.json": JSON.stringify(
              {
                version: "1.0",
                tests: [
                  { selector: "foo/sample.test.ts#baz" },
                  { id: 3 },
                  { selector: "foo/sample.test.ts#foo bar boop" },
                ],
              },
              null,
              2,
            ),
          },
          {
            env: (testDir) => ({
              ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json"),
            }),
          },
        );

        expect(tests).toHaveLength(3);
        expect(tests).toContainEqual(expect.objectContaining({ name: "baz", fullName: "foo/sample.test.ts#baz" }));
        expect(tests).toContainEqual(expect.objectContaining({ name: "beep", fullName: "foo/sample.test.ts#beep" }));
        expect(tests).toContainEqual(
          expect.objectContaining({ name: "boop", fullName: "foo/sample.test.ts#foo bar boop" }),
        );
      });
    });
  }
});

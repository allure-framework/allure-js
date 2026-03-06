import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("labels", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("should add host & thread labels", async () => {
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
        expect(tests[0].labels).toEqual(
          expect.arrayContaining([
            {
              name: "host",
              value: expect.any(String),
            },
            {
              name: "thread",
              value: expect.any(String),
            },
          ]),
        );
      });

      it("should add package label", async () => {
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
        expect(tests[0].labels).toEqual(
          expect.arrayContaining([
            {
              name: "package",
              value: "sample.test.ts",
            },
          ]),
        );
      });

      it("should add package label for tests in directories", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "foo/bar/baz.test.ts": `
      import { test } from "vitest";

      test("qux", async () => {});
    `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].labels).toEqual(
          expect.arrayContaining([
            {
              name: "package",
              value: "foo.bar.baz.test.ts",
            },
          ]),
        );
      });

      it("should add labels from env variables", async () => {
        const { tests } = await runVitestInlineTest(
          {
            "vitest.config.ts": configFileAccessor,
            "sample.test.ts": `
      import { test } from "vitest";

      test("foo", () => {});
      test("bar", () => {});
    `,
          },
          {
            env: () => ({
              ALLURE_LABEL_: "-",
              ALLURE_LABEL_A: "",
              ALLURE_LABEL_B: "foo",
              ALLURE_LABEL_workerId: "baz",
            }),
          },
        );

        tests.forEach((testResult) => {
          expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "A", value: "" }));
          expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "B", value: "foo" }));
          expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "workerId", value: "baz" }));
        });
      });
    });
  }
});

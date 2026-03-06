import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("expect", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("should add actual and expected values when using expect", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      expect("a value").toEqual("the other one");
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests).toMatchObject([
          {
            name: "fail test",
            status: "failed",
            statusDetails: {
              message: "expected 'a value' to deeply equal 'the other one'",
              expected: "the other one",
              actual: "a value",
            },
          },
        ]);
      });

      it("should add actual and expected values when using expect with match object", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      expect({ nested: { obj: "value", n: 123}}).toMatchObject({ nested: { obj: "some"} });
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests).toMatchObject([
          {
            name: "fail test",
            status: "failed",
            statusDetails: {
              expected: "Object {\n" + '  "nested": Object {\n' + '    "obj": "some",\n' + "  },\n" + "}",
              actual: "Object {\n" + '  "nested": Object {\n' + '    "obj": "value",\n' + "  },\n" + "}",
            },
          },
        ]);
      });

      it("should add actual and expected values when regular exception is thrown", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      throw new Error("fail!")
    });
  `,
        });

        expect(tests).toHaveLength(1);

        const [{ name, status, statusDetails }] = tests;

        expect(name).toBe("fail test");
        expect(status).toBe("broken");
        expect(statusDetails.message).toBe("fail!");
        expect(statusDetails.trace).toContain("Error: fail!");
        expect(statusDetails.expected).toBeUndefined();
        expect(statusDetails.actual).toBeUndefined();
      });
    });
  }
});

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

      it("should report vitest expect matchers as steps by default", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test, expect } from "vitest";

    test("pass test", async () => {
      expect(1).toBe(1);
      expect(1).not.toBe(2);
      expect([1]).toHaveLength(1);
      await expect(Promise.resolve(1)).resolves.toBe(1);
      await expect(Promise.reject("boom")).rejects.toBe("boom");
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].steps.map((s) => s.name)).toEqual([
          "expect(1).toBe(1)",
          "expect(1).not.toBe(2)",
          "expect([1]).toHaveLength(1)",
          "expect(1).resolves.toBe(1)",
          'expect("boom").rejects.toBe("boom")',
        ]);
        expect(tests[0].steps.find((s) => s.name === "expect([1]).toHaveLength(1)")?.steps).toEqual([]);
        expect(tests[0].steps.every((s) => s.status === "passed")).toBe(true);
      });

      if (env === "node") {
        it("should keep matcher steps attached to the correct concurrent test", async () => {
          const { tests } = await runVitestInlineTest({
            "vitest.config.ts": configFileAccessor,
            "sample.test.ts": `
    import { describe, test, expect } from "vitest";

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    describe.concurrent("dummy", () => {
      test("first", async () => {
        expect("first sync").toBe("first sync");
        await delay(200);
        expect("first async").toBe("first async");
      });

      test("second", async () => {
        expect("second sync").toBe("second sync");
        await delay(100);
        expect("second async").toBe("second async");
      });
    });

  `,
          });

          expect(tests).toHaveLength(2);
          const first = tests.find(({ name }) => name === "first");
          const second = tests.find(({ name }) => name === "second");

          expect(first?.steps.map(({ name }) => name)).toEqual([
            'expect("first sync").toBe("first sync")',
            'expect("first async").toBe("first async")',
          ]);
          expect(second?.steps.map(({ name }) => name)).toEqual([
            'expect("second sync").toBe("second sync")',
            'expect("second async").toBe("second async")',
          ]);
        });
      }

      it("should format asymmetric matcher arguments", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test, expect } from "vitest";

    test("pass test", () => {
      expect([{ name: "foo", value: "bar", extra: "baz" }]).toContainEqual(
        expect.objectContaining({ name: "foo", value: "bar" }),
      );
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].steps.map((s) => s.name)).toEqual([
          'expect([{"name":"foo","value":"bar","extra":"baz"}]).toContainEqual(expect.objectContaining({"name":"foo","value":"bar"}))',
        ]);
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
            steps: [
              {
                name: 'expect("a value").toEqual("the other one")',
                status: "failed",
                statusDetails: {
                  expected: "the other one",
                  actual: "a value",
                },
              },
            ],
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
              expected: expect.toBeOneOf([
                // Vitest < 4.1
                "Object {\n" + '  "nested": Object {\n' + '    "obj": "some",\n' + "  },\n" + "}",
                // Vitest 4.1+
                "{\n" + '  "nested": {\n' + '    "obj": "some",\n' + "  },\n" + "}",
              ]),
              actual: expect.toBeOneOf([
                "Object {\n" + '  "nested": Object {\n' + '    "obj": "value",\n' + "  },\n" + "}",
                "{\n" + '  "nested": {\n' + '    "obj": "value",\n' + "  },\n" + "}",
              ]),
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

      it("should disable matcher reporting when reportMatchers is false", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": ({ allureResultsPath }) =>
            env === "node"
              ? createVitestConfig(allureResultsPath, { reportMatchers: false })
              : createVitestBrowserConfig(allureResultsPath, { reportMatchers: false }),
          "sample.test.ts": `
    import { test, expect } from "vitest";
    import * as allure from "allure-js-commons";

    test("pass test", async () => {
      expect(1).toBe(1);
      await allure.step("manual step", async () => {
        expect(2).toBe(2);
      });
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].steps.map((s) => s.name)).toEqual(["manual step"]);
      });

      it("should not report raw chai assertions as vitest matcher steps", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { chai, test } from "vitest";

    test("pass test", () => {
      chai.expect(1).to.equal(1);
    });

  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].steps).toEqual([]);
      });
    });
  }
});

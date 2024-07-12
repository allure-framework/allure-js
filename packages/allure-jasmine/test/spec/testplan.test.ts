import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils.js";

it("should filter tests by selector", async () => {
  const { tests } = await runJasmineInlineTest(
    {
      "spec/test/sample.spec.js": `
        it("foo", () => {});
        it("bar", () => {});
        it("baz", () => {});
        it("qux", () => {});
      `,
      "testplan.json": JSON.stringify({
        tests: [{ selector: "spec/test/sample.spec.js#foo" }, { selector: "spec/test/sample.spec.js#baz" }],
      }),
    },
    { ALLURE_TESTPLAN_PATH: "testplan.json" },
  );

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "foo",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "baz",
        status: Status.PASSED,
      }),
    ]),
  );
});

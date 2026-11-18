import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runJasmineInlineTest } from "../utils.js";

it.each([
  { mutedTests: [{ id: 77 }] },
  { mutedTests: [{ selector: "dummy:spec/test/sample.spec.js#muted test" }] },
  { tests: [], mutedTests: [{ id: 77 }] },
  { tests: [{ id: 77 }, { id: 78 }], mutedTests: [{ id: 77 }] },
  {
    tests: [{ selector: "muted test" }, { id: 78 }],
    mutedTests: [{ selector: "dummy:spec/test/sample.spec.js#muted test" }],
  },
  {
    tests: [{ selector: "dummy:spec/test/sample.spec.js#muted test" }, { id: 78 }],
    mutedTests: [{ selector: "muted test" }],
  },
])("excludes muted bodies: %j", async (plan) => {
  const { tests } = await runJasmineInlineTest(
    {
      "spec/test/sample.spec.js": `
        it("muted test @allure.id=77", () => { throw new Error("muted body executed"); });
        it("survivor @allure.id=78", () => {});
      `,
      "testplan.json": JSON.stringify({ version: "1.0", ...plan }),
    },
    { ALLURE_TESTPLAN_PATH: "testplan.json" },
  );

  expect(tests).toEqual([expect.objectContaining({ name: "survivor", status: "passed" })]);
});

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
        version: "1.0",
        tests: [{ selector: "dummy:spec/test/sample.spec.js#foo" }, { selector: "dummy:spec/test/sample.spec.js#baz" }],
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

it("should filter tests by id", async () => {
  const { tests } = await runJasmineInlineTest(
    {
      "spec/test/sample.spec.js": `
        it("foo @allure.id:1004", () => {});
        it("bar", () => {});
        it("baz @allure.id:1005", () => {});
        it("qux @allure.id:1006", () => {});
      `,
      "testplan.json": JSON.stringify({
        version: "1.0",
        tests: [{ id: "1004" }, { id: "1005" }],
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

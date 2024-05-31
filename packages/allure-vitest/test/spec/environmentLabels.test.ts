import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../utils.js";

it("should add environment labels", async () => {
  const { tests } = await runVitestInlineTest(
    `
      import { test } from "vitest";

      test("foo", () => {});
      test("bar", () => {});
    `,
    undefined,
    undefined,
    {
      env: {
        ALLURE_LABEL_: "-",
        ALLURE_LABEL_A: "",
        ALLURE_LABEL_B: "foo",
        ALLURE_LABEL_b: "bar",
        ALLURE_LABEL_workerId: "baz",
      },
    },
  );

  tests.forEach((testResult) => {
    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: LabelName.ALLURE_ID, value: "1" }));
    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "A", value: "" }));
    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "B", value: "foo" }));
    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "b", value: "bar" }));
    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "workerId", value: "workerId" }));
  });
});

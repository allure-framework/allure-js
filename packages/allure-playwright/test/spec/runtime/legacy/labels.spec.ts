import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets runtime labels", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect, allure } from "allure-playwright";

      test("should add epic label", async ({}, testInfo) => {
        await allure.label("foo", "bar");
        await allure.allureId("foo");
        await allure.epic("foo");
        await allure.feature("foo");
        await allure.layer("foo");
        await allure.owner("foo");
        await allure.parentSuite("foo");
        await allure.subSuite("foo");
        await allure.suite("foo");
        await allure.severity("foo");
        await allure.story("foo");
        await allure.tag("foo");
        await allure.labels({ name: "test", value: "testValue" }, { name: "test2", value: "testValue2" });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: "test", value: "testValue" });
  expect(tests[0].labels).toContainEqual({ name: "test2", value: "testValue2" });
});

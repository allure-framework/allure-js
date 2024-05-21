import { resolve } from "node:path";
import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runJasmineInlineTest } from "../../../utils";

it("sets labels", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const {
        label,
        labels,
        feature,
        allureId,
        epic,
        layer,
        owner,
        parentSuite,
        suite,
        subSuite,
        severity,
        story,
        tag,
      } = require("allure-js-commons");

      it("label", async () => {
        await label("foo", "bar");
        await allureId("foo");
        await epic("foo");
        await feature("foo");
        await layer("foo");
        await owner("foo");
        await parentSuite("foo");
        await subSuite("foo");
        await suite("foo");
        await severity("foo");
        await story("foo");
        await tag("foo");
        await labels({ name: "test", value: "testValue" }, { name: "test2", value: "testValue2" });
      })
    `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
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

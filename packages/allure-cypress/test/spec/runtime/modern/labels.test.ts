import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCypressInlineTest } from "../../../utils.js";

it("adds all the possible labels", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import {
      label,
      allureId,
      epic,
      feature,
      layer,
      owner,
      parentSuite,
      suite,
      subSuite,
      severity,
      story,
      tag,
    } from "${allureCommonsModulePath}";

    it("labels", () => {
      label("foo", "bar");
      allureId("foo");
      epic("foo");
      feature("foo");
      layer("foo");
      owner("foo");
      parentSuite("foo");
      subSuite("foo");
      suite("foo");
      severity("foo");
      story("foo");
      tag("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.ALLURE_ID, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.EPIC, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.FEATURE, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.LAYER, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.OWNER, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.PARENT_SUITE, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SUB_SUITE, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SUITE, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SEVERITY, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.STORY, value: "foo" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.TAG, value: "foo" }));
});

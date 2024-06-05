import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("adds labels", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "login.test.js": `
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

      Feature("login-feature");
      Scenario("login-scenario1", async () => {
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
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "foo",
        value: "bar",
      },
      {
        name: LabelName.LANGUAGE,
        value: "javascript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "codeceptjs",
      },
      {
        name: LabelName.ALLURE_ID,
        value: "foo",
      },
      {
        name: LabelName.EPIC,
        value: "foo",
      },
      {
        name: LabelName.FEATURE,
        value: "foo",
      },
      {
        name: LabelName.LAYER,
        value: "foo",
      },
      {
        name: LabelName.OWNER,
        value: "foo",
      },
      {
        name: LabelName.PARENT_SUITE,
        value: "foo",
      },
      {
        name: LabelName.SUB_SUITE,
        value: "foo",
      },
      {
        name: LabelName.SUITE,
        value: "foo",
      },
      {
        name: LabelName.SEVERITY,
        value: "foo",
      },
      {
        name: LabelName.STORY,
        value: "foo",
      },
      {
        name: "test",
        value: "testValue",
      },
      {
        name: "test2",
        value: "testValue2",
      },
    ]),
  );
});

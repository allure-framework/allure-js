import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons/sdk/node";
import { runCodeceptJsInlineTest } from "../../../utils";

it("adds labels", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "login.test.js": `
      Feature("login-feature");
      Scenario("login-scenario1", async () => {
        const allure = codeceptjs.container.plugins("allure");

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

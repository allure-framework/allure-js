import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should add host & thread labels", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("failed-scenario", async ({ I }) => {
          I.fail();
        });
        Scenario("passed-scenario", async ({ I }) => {
          I.pass();
        });
      `,
    },
    {},
  );

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "failed-scenario",
        labels: expect.arrayContaining([
          {
            name: "host",
            value: expect.any(String),
          },
          {
            name: "thread",
            value: expect.any(String),
          },
        ]),
      }),
      expect.objectContaining({
        name: "passed-scenario",
        labels: expect.arrayContaining([
          {
            name: "host",
            value: expect.any(String),
          },
          {
            name: "thread",
            value: expect.any(String),
          },
        ]),
      }),
    ]),
  );
});

it("should add package label", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("failed-scenario", async ({ I }) => {
          I.fail();
        });
        Scenario("passed-scenario", async ({ I }) => {
          I.pass();
        });
      `,
    },
    {},
  );

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "failed-scenario",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.login.test.js",
          },
        ]),
      }),
      expect.objectContaining({
        name: "passed-scenario",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.login.test.js",
          },
        ]),
      }),
    ]),
  );
});

it("should not depend on CWD", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("failed-scenario", async ({ I }) => {
          I.fail();
        });
        Scenario("passed-scenario", async ({ I }) => {
          I.pass();
        });
      `,
    },
    { cwd: "nested" },
  );

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "failed-scenario",
        fullName: "nested/login.test.js: login-feature > failed-scenario",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.login.test.js",
          },
        ]),
      }),
      expect.objectContaining({
        name: "passed-scenario",
        fullName: "nested/login.test.js: login-feature > passed-scenario",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.login.test.js",
          },
        ]),
      }),
    ]),
  );
});

it("should add labels from env variables", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "sample.test.js": `
        Feature("sample-feature");
        Scenario("sample-scenario", async () => {});
      `,
    },
    {
      env: {
        ALLURE_LABEL_A: "a",
        ALLURE_LABEL_B: "b",
      },
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});

it("should add labels from tags", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "login.test.js": `
      Feature("bdd")
      Scenario('bdd', () => {
      }).tag('@allure.label.epic:WebInterface')
        .tag('@allure.label.feature:EssentialFeatures')
        .tag('@allure.label.story:Authentication');
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: LabelName.EPIC,
        value: "WebInterface",
      },
      {
        name: LabelName.FEATURE,
        value: "EssentialFeatures",
      },
      {
        name: LabelName.STORY,
        value: "Authentication",
      },
    ]),
  );

  expect(tests[0].labels.filter((l) => l.name === LabelName.EPIC)).toHaveLength(1);
  expect(tests[0].labels.filter((l) => l.name === LabelName.FEATURE)).toHaveLength(1);
  expect(tests[0].labels.filter((l) => l.name === LabelName.STORY)).toHaveLength(1);
});

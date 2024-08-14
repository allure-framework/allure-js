import { expect, it } from "vitest";
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

it("should add labels from env variables", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "sample.test.js": `
        Feature("sample-feature");
        Scenario("sample-scenario", async () => {});
      `,
    },
    {
      ALLURE_LABEL_A: "a",
      ALLURE_LABEL_B: "b",
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

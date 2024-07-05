import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../utils.js";

it("sets allure labels from env variables", async () => {
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

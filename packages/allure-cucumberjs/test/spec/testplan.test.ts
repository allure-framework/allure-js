import { expect, it } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runCucumberInlineTest } from "../utils.js";

it("should skip tests based on test plan", async () => {
  const testPlan: TestPlanV1 = {
    version: "1.0",
    tests: [
      {
        id: "87",
      },
      {
        id: "123",
        selector: "invalid",
      },
      {
        selector: "features/testplan2.feature#test 5",
      },
    ],
  };

  const { tests } = await runCucumberInlineTest(["testplan1", "testplan2"], ["testplan"], { testPlan });

  expect(tests).not.toContainEqual(
    expect.objectContaining({
      name: "test 1",
    }),
  );

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "test 2",
    }),
  );

  expect(tests).not.toContainEqual(
    expect.objectContaining({
      name: "test 3",
    }),
  );

  expect(tests).not.toContainEqual(
    expect.objectContaining({
      name: "test 4",
    }),
  );

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "test 5",
    }),
  );

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "test 6",
    }),
  );
});

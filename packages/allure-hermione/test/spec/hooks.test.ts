import { TestResult } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermione } from "../helper/run_helper";

describe("hooks", () => {
  it("applies commands from `beforeEach` and `afterEach` for each test", async () => {
    const allureResults = await runHermione(["./test/fixtures/hooks.js"]);

    const hasHookLabel = (result: TestResult, hook: string) => {
      return !!result.labels.find(({ name, value }) => name === "hook" && value === hook);
    };

    expect(
      allureResults.tests.every(
        (result) => hasHookLabel(result, "before") && hasHookLabel(result, "after"),
      ),
    ).eq(true);
  });
});

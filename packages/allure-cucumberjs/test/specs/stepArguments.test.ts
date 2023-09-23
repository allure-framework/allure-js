import { TestResult } from "allure-js-commons/src/model";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("step arguments", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["stepArguments"]);
  });

  it("should set steps", () => {
    const result = summary.results["plus operator"];

    expect(result.steps.map((step) => step.name)).eql([
      "Given a is 5",
      "And b is 10",
      "When I plus a and b",
      "Then the result is 15",
    ]);
  });
});

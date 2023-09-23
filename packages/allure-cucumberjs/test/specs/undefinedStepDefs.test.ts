import { Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("with undefined steps", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["undefinedStepDefs"], {});
  });

  it("provides details message that test doesn't have implementation", async () => {
    const result = summary.results.a;

    expect(result.status).eq(undefined);
    expect(result.statusDetails.message).eq("The test doesn't have an implementation.");
  });

  it("provides details message that step doesn't have implementation", async () => {
    const result = summary.results.b;

    expect(result.steps).length(2);
    expect(result.steps[0].status).eq(Status.PASSED);
    expect(result.steps[1].status).eq(undefined);
    expect(result.steps[1].statusDetails.message).eq("The step doesn't have an implementation.");
  });
});

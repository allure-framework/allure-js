import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("with lambda arrow steps", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["withArrowSteps"]);
  });

  it("appends labels from lambda steps to the parent test", () => {
    const { labels } = summary.results.succeed;

    labels.should.contain.something.like({
      name: LabelName.EPIC,
      value: "foo",
    });
  });

  it("handles passed lambda steps", () => {
    const { steps } = summary.results.succeed;

    expect(steps).length(1);

    const firstLevelSteps = steps[0].steps;

    expect(firstLevelSteps).length(1);
    expect(firstLevelSteps[0].name).eq("first nested step");
    expect(firstLevelSteps[0].status).eq(Status.PASSED);

    const secondLevelSteps = firstLevelSteps[0].steps;

    expect(secondLevelSteps).length(1);
    expect(secondLevelSteps[0].name).eq("second nested step");
    expect(secondLevelSteps[0].status).eq(Status.PASSED);
    expect(secondLevelSteps[0].attachments).length(1);
  });

  it("handles failed lambda steps", () => {
    const { status, steps } = summary.results.failed;

    expect(status).eq(Status.FAILED);
    expect(steps).length(1);

    const firstLevelSteps = steps[0].steps;

    expect(firstLevelSteps).length(1);
    expect(firstLevelSteps[0].name).eq("first nested step");
    expect(firstLevelSteps[0].status).eq(Status.BROKEN);
    expect(firstLevelSteps[0].statusDetails.message).contains("error message");
  });
});

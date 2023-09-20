import { Status } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("simple", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["simple"]);
  });

  it("sets fullName, testCaseId and historyId", () => {
    const passed = summary.results.passed;

    expect(passed.fullName).eq("test/fixtures/features/simple.feature#passed");
    expect(passed.testCaseId).eq("4dc70bb7b4b8db0847961b8a454ed052");
    expect(passed.historyId).eq(
      "4dc70bb7b4b8db0847961b8a454ed052:d41d8cd98f00b204e9800998ecf8427e",
    );
  });

  it("reports passed test", () => {
    const passed = summary.results.passed;

    expect(passed.status).eq(Status.PASSED);
    passed.steps.should.contain.something.like({
      name: "Given a passed step",
      status: Status.PASSED,
    });
  });

  it("reports failed test", () => {
    const failed = summary.results.failed;

    expect(failed.status).eq(Status.FAILED);
    expect(failed.statusDetails.message).contains("AssertionError").contains("1").contains("2");
    failed.steps.should.contain.something.like({
      name: "Given a failed step",
      status: Status.FAILED,
    });
  });

  it("reports test with manually added parameter", () => {
    const parameterized = summary.results.parameterized;

    parameterized.parameters.should.contain.something.like({
      name: "Browser",
      value: JSON.stringify("firefox"),
      excluded: false,
    });
  });
});

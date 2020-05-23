import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabelValue, runTests } from "../utils";

@suite
class CommonSuite {
  @test
  async shouldHavePassedAndFailedTests() {
    const writerStub = await runTests("common");
    expect(writerStub.getTestByName("shouldPass").status).eq(Status.PASSED);
    expect(writerStub.getTestByName("shouldFail").status).eq(Status.FAILED);

    const brokenTest = writerStub.getTestByName("shouldBreak");
    expect(brokenTest.status).eq(Status.BROKEN);
    expect(brokenTest.statusDetails.message).eq("Broken");
    expect(brokenTest.statusDetails.trace).not.eq(undefined);

    const skippedTest = writerStub.getTestByName("shouldSkip");
    expect(skippedTest.status).eq(Status.SKIPPED);
    expect(skippedTest.statusDetails.message).eq("Test ignored");
    expect(skippedTest.statusDetails.trace).eq(undefined);
  }

  @test
  async shouldHaveCorrectSuitesForPendingTests() {
    const writerStub = await runTests("pending");

    const simplePending = writerStub.getTestByName("simple pending");
    expect(simplePending.status).eq(Status.SKIPPED);
    expect(simplePending.historyId).eq("a50daf11cd50a0dcb2583dfaa90f796a");
    expect(findLabelValue(simplePending, LabelName.PARENT_SUITE)).eq("Pending tests");

    const skippedInRuntime = writerStub.getTestByName("skipped in runtime");
    expect(skippedInRuntime.status).eq(Status.SKIPPED);
    expect(skippedInRuntime.historyId).eq("e67a7b309c00b0cfa384a68790ef7f57");
    expect(findLabelValue(skippedInRuntime, LabelName.PARENT_SUITE)).eq("Pending tests");
  }
}

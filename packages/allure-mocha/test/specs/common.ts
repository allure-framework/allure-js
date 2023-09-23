import { suite, test } from "@testdeck/mocha";
import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
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
    expect(simplePending.historyId).eq(
      "7bb8f8614d6c2bafb60878af9abc9b46:d41d8cd98f00b204e9800998ecf8427e",
    );
    expect(findLabelValue(simplePending, LabelName.PARENT_SUITE)).eq("Pending tests");

    const skippedInRuntime = writerStub.getTestByName("skipped in runtime");
    expect(skippedInRuntime.status).eq(Status.SKIPPED);
    expect(skippedInRuntime.historyId).eq(
      "c3dbeb24ccd3c07f3504d664439d51f5:d41d8cd98f00b204e9800998ecf8427e",
    );
    expect(findLabelValue(skippedInRuntime, LabelName.PARENT_SUITE)).eq("Pending tests");
  }
}

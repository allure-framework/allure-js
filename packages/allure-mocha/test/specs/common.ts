import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { runTests } from "../utils";

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
}

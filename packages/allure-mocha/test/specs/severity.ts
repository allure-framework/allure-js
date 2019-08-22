import { Severity, Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabel, runTests } from "../utils";

@suite
class SeveritySuite {
  @test
  async shouldHaveSeverity() {
    const writerStub = await runTests("severity");
    const test = writerStub.getTestByName("shouldAssignSeverity");
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "severity")!.value).eq(Severity.BLOCKER);
  }
}

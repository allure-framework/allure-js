import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Severity, Status } from "allure-js-commons";
import { findLabelValue, runTests } from "../utils";

@suite
class SeveritySuite {
  @test
  async shouldHaveSeverity() {
    const writerStub = await runTests("severity");
    const test = writerStub.getTestByName("shouldAssignSeverity");
    expect(test.status).eq(Status.PASSED);
    expect(findLabelValue(test, "severity")).eq(Severity.BLOCKER);
  }
}

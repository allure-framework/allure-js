import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Severity, Status } from "allure-js-commons";
import { findLabel, runTests } from "../utils";

@suite
class SeveritySuite {
  @test
  async shouldHaveSeverity() {
    const writerStub = await runTests("severity");
    expect(writerStub.groups.find((suite) => suite.name === "SeveritySubSuite")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedSeverity");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "severity").value).eq(Severity.CRITICAL);
  }
}

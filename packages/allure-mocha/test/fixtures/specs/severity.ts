import { Severity } from "allure-js-commons";
import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class SeveritySubSuite {
  @test
  shouldAssignSeverity() {
    allure.severity(Severity.BLOCKER);
  }
}

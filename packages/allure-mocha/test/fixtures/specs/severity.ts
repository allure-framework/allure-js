import { suite, test } from "@testdeck/mocha";
import { Severity } from "allure-js-commons";
import { getAllure } from "../../../runtime";

@suite
class SeveritySubSuite {
  @test
  shouldAssignSeverity() {
    const allure = getAllure();

    allure.severity(Severity.BLOCKER);
  }
}

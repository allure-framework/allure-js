import { Severity } from "allure-js-commons";
import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class SeveritySubSuite {
  @test
  shouldAssignSeverity() {
    allure.severity(Severity.BLOCKER);
  }
}

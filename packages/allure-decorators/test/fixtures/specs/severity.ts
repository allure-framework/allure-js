import { Severity } from "allure-js-commons";
import { suite, test } from "@testdeck/mocha";
import { severity } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class SeveritySubSuite extends BaseTest {
  @severity(Severity.CRITICAL)
  @test
  shouldAssignDecoratedSeverity() {}
}

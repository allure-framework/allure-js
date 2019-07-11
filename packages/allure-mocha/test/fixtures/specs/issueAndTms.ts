import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

// @ts-ignore
const allure: MochaAllureInterface = global.allure;

@suite
class IssueAndTms {
  @test
  shouldAssignIssueAndTms() {
    allure.issue("1", "http://localhost/issues/1");
    allure.tms("2", "http://localhost/issues/2");
    //allure.addIssue("3"); // fixme
  }
}

import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class IssueAndTms {
  @test
  shouldAssignIssueAndTms() {
    allure.issue("1", "http://localhost/issues/1");
    allure.tms("2", "http://localhost/issues/2");
    //allure.addIssue("3"); // fixme
  }
}

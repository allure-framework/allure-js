import { suite, test } from "@testdeck/mocha";
import { assignPmsUrl, assignTmsUrl, issue, testCaseId } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class IssueAndTmsWithUrl extends BaseTest {
  public before() {
    super.before();
    assignPmsUrl(BaseTest.TEST_URL);
    assignTmsUrl(BaseTest.TEST_URL);
  }

  @issue("6")
  @testCaseId("7")
  @test
  shouldAssignDecoratedIssueAndTmsWithUrl() {}
}

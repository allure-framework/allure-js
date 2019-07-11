import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import {
  cleanResults,
  findLabel,
  findLinks,
  findTest,
  runTests,
  whenResultsAppeared
} from "../utils";

@suite
class IssueAndTmsSuite {
  before() {
    cleanResults();
    runTests("issueAndTms");
  }

  @test
  shouldHaveIssueAndTmsLinks() {
    const testName = "shouldAssignIssueAndTms";
    return whenResultsAppeared().then(results => {
      expect(findTest("IssueAndTms")).not.eq(undefined);

      const links = findLinks(testName);
      expect(links).length(2);
      expect(findTest(testName).status).eq(Status.PASSED);

      expect(links.map(link => link.name)).contains("1", "2");
      expect(links.map(link => link.url))
        .contains("http://localhost/issues/1", "http://localhost/issues/2");
      expect(links.map(link => link.type)).contains("issue", "tms");
    });
  }
}

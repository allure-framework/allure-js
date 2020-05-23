import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";

@suite
class IssueAndTmsSuite {
  @test
  async shouldHaveIssueAndTmsLinks() {
    const writerStub = await runTests("issueAndTms");
    const test = writerStub.getTestByName("shouldAssignIssueAndTms");

    expect(test.links).length(2);
    expect(test.status).eq(Status.PASSED);

    expect(test.links.map(link => link.name)).contains("1", "2");
    expect(test.links.map(link => link.url)).contains("http://localhost/issues/1", "http://localhost/issues/2");
    expect(test.links.map(link => link.type)).contains("issue", "tms");
  }
}

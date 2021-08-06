import { Status } from "allure-js-commons";
import * as chai from "chai";
import assertArrays from "chai-arrays";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";
import { BaseTest } from "../fixtures/specs/baseTest";

const expect = chai.expect;
chai.use(assertArrays);

@suite
class IssueAndTmsSuite {
  @test
  async shouldHaveIssueAndTmsLinks() {
    const writerStub = await runTests("issueAndTms");
    expect(writerStub.groups.find((suite) => suite.name === "IssueAndTms")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedIssueAndTms");
    expect(test).not.eq(undefined);
    expect(test.links).length(2);
    expect(test.status).eq(Status.PASSED);
    expect(test.links.map((link) => link.name)).to.be.equalTo(["4", "5"]);
    expect(test.links.map((link) => link.url)).to.be.equalTo([
      "http://localhost/4",
      "http://localhost/5",
    ]);
    expect(test.links.map((link) => link.type)).to.be.equalTo(["issue", "tms"]);
  }

  @test
  async shouldHaveCustomIssueAndTmsLinks() {
    const writerStub = await runTests("issueAndTmsWithUrl");
    expect(writerStub.groups.find((suite) => suite.name === "IssueAndTmsWithUrl")).not.eq(
      undefined,
    );
    const test = writerStub.getTestByName("shouldAssignDecoratedIssueAndTmsWithUrl");
    expect(test).not.eq(undefined);
    expect(test.links).length(2);
    expect(test.status).eq(Status.PASSED);
    expect(test.links.map((link) => link.name)).to.be.equalTo(["6", "7"]);
    expect(test.links.map((link) => link.url)).to.be.equalTo([
      `${BaseTest.TEST_URL}/6`,
      `${BaseTest.TEST_URL}/7`,
    ]);
    expect(test.links.map((link) => link.type)).to.be.equalTo(["issue", "tms"]);
  }
}

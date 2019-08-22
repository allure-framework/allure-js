import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabel, runTests } from "../utils";

@suite
class TagSuite {
  @test
  async shouldHaveTags() {
    const writerStub = await runTests("tag");
    const test = writerStub.getTestByName("shouldAssignTag");

    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "tag")!.value).eq("smoke");
  }
}

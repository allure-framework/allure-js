import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findLabel, runTests } from "../utils";

@suite
class TagSuite {
  @test
  async shouldHaveTags() {
    const writerStub = await runTests("tag");
    expect(writerStub.groups.find((suite) => suite.name === "Tag")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedTag");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "tag").value).eq("regression");
  }
}

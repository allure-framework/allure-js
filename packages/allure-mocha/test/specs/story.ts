import { Severity, Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabel, runTests } from "../utils";

@suite
class StorySuite {
  @test
  async shouldHaveStories() {
    const writerStub = await runTests("story");
    const test = writerStub.getTestByName("shouldAssignStory");

    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "story")!.value).eq("Common story");
  }
}

import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findLabel, runTests } from "../utils";

@suite
class StorySuite {
  @test
  async shouldHaveStories() {
    const writerStub = await runTests("story");
    expect(writerStub.groups.find((suite) => suite.name === "Story")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedStory");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "story").value).eq("Common decorated story");
  }
}

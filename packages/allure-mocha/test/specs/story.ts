import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabelValue, runTests } from "../utils";

@suite
class StorySuite {
  @test
  async shouldHaveStories() {
    const writerStub = await runTests("story");
    const test = writerStub.getTestByName("shouldAssignStory");

    expect(test.status).eq(Status.PASSED);
    expect(findLabelValue(test, "story")).eq("Common story");
  }
}

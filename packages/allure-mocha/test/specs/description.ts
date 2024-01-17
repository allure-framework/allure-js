import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { runTests } from "../utils";

@suite
class DescriptionSuite {
  @test
  async shouldHaveDescription() {
    const writerStub = await runTests("description");

    const currentTest = writerStub.getTestByName("shouldAssignDescription");
    expect(currentTest.status).eq(Status.PASSED);
    expect(currentTest.description).eq("Test description");
  }
}

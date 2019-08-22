import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabel, runTests } from "../utils";

@suite
class FeatureSuite {
  @test
  async shouldHaveFeature() {
    const writerStub = await runTests("feature");
    const test = writerStub.getTestByName("shouldAssignFeature");

    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "feature")!.value).eq("Login");
  }
}

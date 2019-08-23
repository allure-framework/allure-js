import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabelValue, runTests } from "../utils";

@suite
class FeatureSuite {
  @test
  async shouldHaveFeature() {
    const writerStub = await runTests("feature");
    const test = writerStub.getTestByName("shouldAssignFeature");

    expect(test.status).eq(Status.PASSED);
    expect(findLabelValue(test, "feature")).eq("Login");
  }
}

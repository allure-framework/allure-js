import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findLabel, runTests } from "../utils";

@suite
class FeatureSuite {
  @test
  async shouldHaveFeature() {
    const writerStub = await runTests("feature");
    expect(writerStub.groups.find((suite) => suite.name === "Feature")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedFeature");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "feature").value).eq("Decorated Feature");
  }
}

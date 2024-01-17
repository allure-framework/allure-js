import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { LabelName } from "allure-js-commons";
import { runTests } from "../utils";

@suite
class PackageSuite {
  @test
  async shouldHaveDescription() {
    const writerStub = await runTests("package");
    const currentTest = writerStub.getTestByName("shouldPass");
    const packageLabel = currentTest.labels.find((label) => label.name === LabelName.PACKAGE);

    expect(packageLabel?.value).eq("test.fixtures.specs");
  }
}

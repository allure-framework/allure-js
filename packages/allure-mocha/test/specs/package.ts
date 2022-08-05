import { suite, test } from "@testdeck/mocha";
import { LabelName } from "allure-js-commons";
import { expect } from "chai";
import { runTests } from "../utils";

@suite
class PackageSuite {
  @test
  async shouldHaveDescription() {
    const writerStub = await runTests("package");
    const currentTest = writerStub.getTestByName("shouldPass");
    const packageLabel = currentTest.labels.find(label => label.name === LabelName.PACKAGE);

    expect(packageLabel?.value).eq("test.fixtures.specs")
  }
}

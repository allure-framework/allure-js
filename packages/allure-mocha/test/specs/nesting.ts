import { InMemoryAllureWriter, LabelName } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabelValue, runTests } from "../utils";

@suite
class NestingSupport {
  private writerStub!: InMemoryAllureWriter;

  async before() {
    this.writerStub = await runTests("nested");
  }

  @test
  shouldAssignAllSuites() {
    const test = this.writerStub.getTestByName("child test");
    expect(findLabelValue(test, LabelName.PARENT_SUITE)).eq("Parent suite");
    expect(findLabelValue(test, LabelName.SUITE)).eq("Nested suite");
    expect(findLabelValue(test, LabelName.SUB_SUITE)).eq("Sub suite");
  }

  @test
  shouldSkipMissingLevels() {
    const test = this.writerStub.getTestByName("shallow test");
    expect(findLabelValue(test, LabelName.PARENT_SUITE)).eq("Parent suite");
    expect(findLabelValue(test, LabelName.SUITE)).eq(undefined);
    expect(findLabelValue(test, LabelName.SUB_SUITE)).eq(undefined);
  }

  @test
  shouldHandleTopLevelTests() {
    const test = this.writerStub.getTestByName("top-level test");
    expect(findLabelValue(test, LabelName.PARENT_SUITE)).eq(undefined);
    expect(findLabelValue(test, LabelName.SUITE)).eq(undefined);
    expect(findLabelValue(test, LabelName.SUB_SUITE)).eq(undefined);
  }

  @test
  shouldMergeSubSuiteNames() {
    const test = this.writerStub.getTestByName("the deepest test");
    expect(findLabelValue(test, LabelName.PARENT_SUITE)).eq("Parent suite");
    expect(findLabelValue(test, LabelName.SUITE)).eq("Nested suite");
    expect(findLabelValue(test, LabelName.SUB_SUITE)).eq("Sub suite > Incredibly nested suite");
  }
}

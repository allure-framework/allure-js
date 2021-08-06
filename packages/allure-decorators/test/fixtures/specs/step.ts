import { suite, test } from "@testdeck/mocha";
import { step } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class Step extends BaseTest {
  @test
  shouldAddDecoratedSteps() {
    this.step1();
    this.step2();
    this.step3();
    this.step5().step1();
  }

  @test
  shouldIgnoreStepWithError() {
    this.step7();
  }

  @step("Execute step 1")
  step1() {}

  @step(() => "Execute step 2")
  step2() {
    this.step3();
  }

  @step(Step.customTitle())
  step3() {
    this.step4();
  }

  @step("Execute step 4")
  step4() {}

  @step("Execute step 5")
  step5() {
    return this.step6();
  }

  @step("Execute step 6")
  step6() {
    return this;
  }

  @step(() => {
    throw new Error("An intentional error in step");
  })
  step7() {
    return this;
  }

  public static customTitle() {
    return "Execute step 3";
  }
}

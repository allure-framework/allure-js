import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Step {
  @test
  shouldAddSteps() {
    allure.step("Step 1", () => "step 1 body");
    allure.step("Step 2", () => "step 2 body");
  }

  @test
  shouldAddInnerStep() {
    allure.step("Step 3", () => {
      allure.step("Step 4", () => "step 4 body");
    });
  }
}

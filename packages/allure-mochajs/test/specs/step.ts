import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { cleanResults, findSteps, findTest, runTests, whenResultsAppeared } from "../utils/index";

@suite
class StepSuite {
  before() {
    cleanResults();
    runTests("step");
  }

  @test
  shouldHaveSteps() {
    const test1Name = "shouldAddSteps";
    const test2Name = "shouldAddInnerStep";
    return whenResultsAppeared().then(() => {
      expect(findTest("Step")).not.eq(undefined);
      expect(findTest(test1Name).status).eq(Status.PASSED);
      expect(findTest(test2Name).status).eq(Status.PASSED);

      let steps = findSteps(test1Name);
      expect(steps.map(step => step.name)).contains("Step 1", "Step 2");
      expect(steps.map(step => step.status)).contains(Status.PASSED);

      steps = findSteps(test2Name);
      expect(steps.map(step => step.name)).contains("Step 3");
      expect(steps.map(step => step.status)).contains(Status.PASSED);

      const subStep = steps
        .map(step => step.steps)
        .pop()
        .pop();
      expect(subStep.name).eq("Step 4");
      expect(subStep.status).eq(Status.PASSED);
    });
  }
}

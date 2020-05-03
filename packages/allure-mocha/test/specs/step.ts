import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";

@suite
class StepSuite {
  @test
  async shouldHaveSteps() {
    const writerStub = await runTests("step");
    const test1 = writerStub.getTestByName("shouldAddSteps");
    const test2 = writerStub.getTestByName("shouldAddInnerStep");
    expect(test1.status).eq(Status.PASSED);
    expect(test2.status).eq(Status.PASSED);

    expect(test1.steps.map(step => step.name)).contains("Step 1", "Step 2");
    expect(test1.steps.map(step => step.status)).contains(Status.PASSED);

    expect(test2.steps.map(step => step.name)).contains("Step 3");
    expect(test2.steps.map(step => step.status)).contains(Status.PASSED);

    const subStep = test2.steps
      .map(step => step.steps)
      .pop()!
      .pop();
    expect(subStep!.name).eq("Step 4");
    expect(subStep!.status).eq(Status.PASSED);
  }
}

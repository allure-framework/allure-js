import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findStep, runTests } from "../utils";

@suite
class StepSuite {
  @test
  async shouldHaveSteps() {
    const writerStub = await runTests("step");
    expect(writerStub.groups.find((suite) => suite.name === "Step")).not.eq(undefined);
    let test = writerStub.getTestByName("shouldAddDecoratedSteps");

    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.steps.map((step) => step.name)).deep.eq([
      "Execute step 1",
      "Execute step 2",
      "Execute step 3",
      "Execute step 5",
      "Execute step 1",
    ]);
    expect(test.steps.map((step) => step.status)).contains(Status.PASSED);

    let subStep = findStep(test, "Execute step 2").steps.pop();
    expect(subStep.name).eq("Execute step 3");
    expect(subStep.status).eq(Status.PASSED);

    subStep = subStep.steps.pop();
    expect(subStep.name).eq("Execute step 4");
    expect(subStep.status).eq(Status.PASSED);

    subStep = findStep(test, "Execute step 3").steps.pop();
    expect(subStep.name).eq("Execute step 4");
    expect(subStep.status).eq(Status.PASSED);

    subStep = findStep(test, "Execute step 5").steps.pop();
    expect(subStep.name).eq("Execute step 6");
    expect(subStep.status).eq(Status.PASSED);

    test = writerStub.getTestByName("shouldIgnoreStepWithError");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.steps).is.ofSize(0);
  }
}

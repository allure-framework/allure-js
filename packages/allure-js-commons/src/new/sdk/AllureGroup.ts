import { TestResultContainer } from "../model.js";
import { AllureExecutable } from "./AllureExecutable.js";
import { fixtureResult, testResultContainer } from "./AllureResults.js";
import { AllureRuntime } from "./AllureRuntime.js";
import { AllureTest } from "./AllureTest.js";

export class AllureGroup {
  private testResultContainer: TestResultContainer;

  constructor(private readonly runtime: AllureRuntime) {
    this.testResultContainer = testResultContainer(runtime.crypto.uuid());
  }

  startGroup(name?: string): AllureGroup {
    const group = new AllureGroup(this.runtime);

    this.testResultContainer.children.push(group.uuid);
    group.name = name || "Unnamed";

    return group;
  }

  startTest(name?: string, start?: number): AllureTest {
    const test = new AllureTest(this.runtime, start);

    this.testResultContainer.children.push(test.uuid);
    test.name = name || "Unnamed";

    return test;
  }

  endGroup(): void {
    // TODO: test that children ended
    this.runtime.writeGroup(this.testResultContainer);
  }

  get uuid(): string {
    return this.testResultContainer.uuid;
  }

  get name(): string {
    return this.testResultContainer.name || "";
  }

  set name(name: string) {
    this.testResultContainer.name = name;
  }

  addBefore(): AllureExecutable {
    const result = fixtureResult();

    this.testResultContainer.befores.push(result);
    return new AllureExecutable(result);
  }

  addAfter(): AllureExecutable {
    const result = fixtureResult();

    this.testResultContainer.afters.push(result);
    return new AllureExecutable(result);
  }
}

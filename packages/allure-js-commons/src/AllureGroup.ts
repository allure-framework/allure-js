import { TestResultContainer } from "./model";
import { ExecutableItemWrapper } from "./ExecutableItemWrapper";
import { AllureTest } from "./AllureTest";
import { fixtureResult, testResultContainer } from "./constructors";
import { AllureRuntime } from "./AllureRuntime";

export class AllureGroup {
  private testResultContainer: TestResultContainer = testResultContainer();

  constructor(private readonly runtime: AllureRuntime) {}

  startGroup(name?: string): AllureGroup {
    const group = new AllureGroup(this.runtime);
    this.testResultContainer.children.push(group.uuid);
    group.name = name || "Unnamed";
    return group;
  }

  startTest(name?: string): AllureTest {
    const test = new AllureTest(this.runtime);
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

  addBefore(): ExecutableItemWrapper {
    const result = fixtureResult();
    this.testResultContainer.befores.push(result);
    return new ExecutableItemWrapper(result);
  }

  addAfter(): ExecutableItemWrapper {
    const result = fixtureResult();
    this.testResultContainer.afters.push(result);
    return new ExecutableItemWrapper(result);
  }
}

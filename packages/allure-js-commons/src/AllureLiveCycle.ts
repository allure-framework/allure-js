import {
  ExecutableItem, FixtureResult,
  StepResult,
  TestResult,
  TestResultContainer
} from "./model";
import { v4 as randomUUID } from "uuid";
import { AllureWriter, IAllureWriter } from "./writers";
import { IAllureConfig } from "./AllureConfig";

type ExecutableKind = "FixtureResult" | "TestResult" | "StepResult";
type GroupingKind = "Container";

interface ContextItem<T, U> {
  readonly uuid: string;
  readonly kind: U;
  item: Partial<T>;
}

type Consumer<T> = (t: Partial<T>, uuid?: string) => void;

class Context<T, U> {
  private context: ContextItem<T, U>[] = [];

  public pushItem(consumer: (contextItem: Partial<T>, uuid: string) => void, kind: U, uuid?: string): string {
    const contextItem: ContextItem<T, U> = { uuid: uuid ?? randomUUID(), item: {}, kind };
    this.context.push(contextItem);
    consumer(contextItem.item, contextItem.uuid);
    return contextItem.uuid;
  }

  public updateItem(consumer: (contextItem: Partial<T>) => void, kind?: U, uuid?: string): void {
    const index = this.findItem(kind, uuid);
    if (index != undefined) {
      consumer(this.context[index].item);
    }
  }

  public updateItems(consumer: (contextItem: Partial<T>) => void, kind?: U): void {
    this.context.forEach(item => {
      if (!kind || (item.kind === kind)) {
        consumer(item.item);
      }
    });
  }

  public popItem(consumer: (contextItem: Partial<T>) => void, kind?: U, uuid?: string) {
    const index = this.findItem(kind, uuid);
    if (index != undefined) {
      consumer(this.context.splice(index, 1)?.[0].item);
    }
  }

  private findItem(kind?: U, uuid?: string) {
    if (!kind && !uuid && this.context.length) {
      return this.context.length - 1;
    }
    return uuid ? this.findItemByUuid(uuid) : this.findItemByKind(kind as U);
  }

  private findItemByUuid(uuid: string) {
    for (let index = this.context.length - 1; index >= 0; index--) {
      if (this.context[index].uuid == uuid) {
        return index;
      }
    }
  }

  private findItemByKind(kind: U) {
    for (let index = this.context.length - 1; index >= 0; index--) {
      if (this.context[index].kind == kind) {
        return index;
      }
    }
  }
}

export class AllureLiveCycle {
  private grouping: Context<TestResultContainer, GroupingKind> = new Context();
  private execution: Context<ExecutableItem, ExecutableKind> = new Context();
  private writer: IAllureWriter;

  constructor(private config: IAllureConfig) {
    this.writer = config.writer || new AllureWriter(config);
  }

  public startTestContainer(consumer?: Consumer<TestResultContainer>, uuid?: string) {
    return this.grouping.pushItem((container, uuid) => {
      container.uuid = uuid;
      if (consumer) {
        consumer(container);
      }
    }, "Container", uuid);
  }

  public updateTestContainer(consumer: Consumer<TestResultContainer>, uuid?: string) {
    this.grouping.updateItem(container => {
      consumer(container);
    }, "Container", uuid);
  }

  public stopTestContainer(consumer?: Consumer<TestResultContainer>, uuid?: string) {
    return this.grouping.popItem(container => {
      if (consumer) {
        consumer(container);
      }
      if (container.befores?.length || container.afters?.length) {
        this.writer.writeGroup(container as TestResultContainer);
      }
    }, "Container", uuid);
  }

  public startFixture(fixtureType: "befores" | "afters",
    consumer?: Consumer<FixtureResult>,
    parentUIID?: string,
    uuid?: string) {
    let fixtureUUID = uuid;
    this.grouping.updateItem(parent => {
      fixtureUUID = this.execution.pushItem(fixtureResult => {
        parent[fixtureType] = [...(parent[fixtureType] || []), fixtureResult as FixtureResult];
        fixtureResult.start = fixtureResult.stop = Date.now();
        if (consumer) {
          consumer(fixtureResult);
        }
      }, "FixtureResult", uuid);
    }, undefined, parentUIID);
    return fixtureUUID;
  }

  public startBeforeFixture(consumer?: Consumer<FixtureResult>, parentUIID?: string, uuid?: string) {
    return this.startFixture("befores", consumer, parentUIID, uuid);
  }

  public startAfterFixture(consumer?: Consumer<FixtureResult>, parentUIID?: string, uuid?: string) {
    return this.startFixture("afters", consumer, parentUIID, uuid);
  }

  public stopFixture(consumer?: Consumer<FixtureResult>, uuid?: string) {
    this.execution.popItem(fixtureResult => {
      fixtureResult.stop = Date.now();
      if (consumer) {
        consumer(fixtureResult);
      }
    }, "FixtureResult", uuid);
  }

  public stopBeforeFixture(consumer?: Consumer<FixtureResult>, uuid?: string) {
    return this.stopFixture(consumer, uuid);
  }

  public stopAfterFixture(consumer?: Consumer<FixtureResult>, uuid?: string) {
    return this.stopFixture(consumer, uuid);
  }

  public scheduleTest(consumer?: Consumer<TestResult>, uuid?: string): string {
    return this.execution.pushItem((testResult: Partial<TestResult>, uuid) => {
      testResult.uuid = uuid;
      this.grouping.updateItems(container => {
        container.children = [...(container.children || []), uuid];
      });
      if (consumer) {
        consumer(testResult);
      }
    }, "TestResult", uuid);
  }

  public startTest(consumer?: Consumer<TestResult>, uuid?: string): void {
    this.execution.updateItem(testResult => {
      testResult.start = testResult.stop = Date.now();
      if (consumer) {
        consumer(testResult);
      }
    }, "TestResult", uuid);
  }

  public updateTest(consumer: Consumer<TestResult>, uuid?: string): void {
    this.execution.updateItem(testResult => {
      consumer(testResult);
    }, "TestResult", uuid);
  }

  public stopTest(consumer?: Consumer<TestResult>, uuid?: string): void {
    this.execution.updateItem(testResult => {
      testResult.stop = Date.now();
      if (consumer) {
        consumer(testResult);
      }
    }, "TestResult", uuid);
  }

  public writeTest(consumer?: Consumer<TestResult>, uuid?: string): any {
    return this.execution.popItem(testResult => {
      if (consumer) {
        consumer(testResult);
      }
      this.writer.writeResult(testResult as TestResult);
    }, "TestResult", uuid);
  }

  public scheduleStep(consumer?: Consumer<StepResult>, parentUIID?: string, uuid?: string): string {
    return this.execution.pushItem((stepResult: Partial<StepResult>, uuid) => {
      if (consumer) {
        consumer(stepResult);
      }
    }, "StepResult", uuid);
  }

  public startStep(consumer?: Consumer<StepResult>, parentUIID?: string, uuid?: string): string {
    let stepUUID = uuid;
    this.execution.updateItem(parent => {
      stepUUID = this.execution.pushItem(stepResult => {
        parent.steps = [...(parent.steps || []), stepResult as StepResult];
        stepResult.start = stepResult.stop = Date.now();
        if (consumer) {
          consumer(stepResult);
        }
      }, "StepResult", uuid);
    }, undefined, parentUIID);
    return stepUUID as string;
  }

  public updateStep(consumer: Consumer<StepResult>, uuid?: string): void {
    this.execution.updateItem(stepResult => {
      consumer(stepResult);
    }, "StepResult", uuid);
  }

  public stopStep(consumer?: Consumer<StepResult>, uuid?: string): void {
    this.execution.popItem(stepResult => {
      stepResult.stop = Date.now();
      if (consumer) {
        consumer(stepResult);
      }
    }, "StepResult", uuid);
  }
}

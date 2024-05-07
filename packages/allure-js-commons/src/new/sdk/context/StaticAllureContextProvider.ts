import { AllureContext, AllureContextBox, AllureContextProvider } from "./AllureContextAbs.js";

/**
 * Allure context that stores its data in mutable class fields.
 * Unsafe from the cuncurrency standpoint.
 */
export class MutableAllureContext implements AllureContext {
  readonly containerStack: string[] = [];
  currentFixture: string | null = null;
  currentTest: string | null = null;
  readonly stepStacks: Map<string, string[]> = new Map();

  getContainerStack = () => this.containerStack;
  getFixture = () => this.currentFixture;
  getTest = () => this.currentTest;
  getStepStack = (scope: string) => this.stepStacks.get(scope) ?? [];
};

/**
 * Implements transitioning between context values by mutating the context
 * object.
 * Unsafe from the cuncurrency standpoint.
 */
export class MutableAllureContextBox implements AllureContextBox {
  private readonly context: MutableAllureContext = new MutableAllureContext();

  get = () => this.context;

  addContainer = (uuid: string) => {
    this.context.containerStack.push(uuid);
  };

  removeContainer = () => {
    this.context.containerStack.pop();
  };

  removeContainerByUuid = (uuid: string) =>
    MutableAllureContextBox.removeAllOccurrences(this.context.containerStack, uuid);

  setFixture = (uuid: string) => {
    this.context.currentFixture = uuid;
  };

  removeFixture = () => {
    this.context.currentFixture = null;
  };

  setTest = (uuid: string) => {
    this.context.currentTest = uuid;
  };

  removeTest = () => {
    this.context.currentTest = null;
  };

  addStep = (scope: string, uuid: string) => {
    const steps = this.context.stepStacks.get(scope);
    if (steps) {
      steps.push(uuid);
    } else {
      this.context.stepStacks.set(scope, [uuid]);
    }
  };

  removeStep = (scope: string) => {
    const steps = this.context.stepStacks.get(scope);
    if (steps) {
      steps.pop();
      if (!steps.length) {
        this.context.stepStacks.delete(scope);
      }
    }
  };

  removeStepByUuid = (scope: string, uuid: string) => {
    const steps = this.context.stepStacks.get(scope);
    if (steps) {
      MutableAllureContextBox.removeAllOccurrences(steps, uuid);
      if (!steps.length) {
        this.context.stepStacks.delete(scope);
      }
    }
  };

  private static removeAllOccurrences<T>(arr: T[], val: T) {
    for (let i = arr.indexOf(val); i !== -1; i = arr.indexOf(val, i)) {
      arr.splice(i, 1);
    }
  }
};

/**
 * Stores the context in a class field. That's a simple but not async-safe way of
 * manipulating the context.
 */
export class StaticContextProvider extends AllureContextProvider {
  private readonly box = new MutableAllureContextBox();

  protected override load = () => this.box;

  /* The changes are already persisted by the mutable nature of this context implementation. */
  protected store = () => {};
};

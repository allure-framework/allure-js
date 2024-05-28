import { AllureContextProviderBase } from "./AllureContextProviderBase.js";
import type { AllureContext, AllureContextHolder } from "./types.js";

/**
 * Allure context that stores its data in mutable class fields.
 * Unsafe from the cuncurrency standpoint.
 */
export class MutableAllureContext implements AllureContext {
  readonly scopeStack: string[] = [];
  currentFixture: string | null = null;
  currentTest: string | null = null;
  readonly stepStacks: Map<string, string[]> = new Map();

  getScope = () => MutableAllureContext.last(this.scopeStack);
  getFixture = () => this.currentFixture;
  getTest = () => this.currentTest;
  getStep = (scope: string) => MutableAllureContext.last(this.stepStacks.get(scope));

  private static last = <T>(arr: T[] | undefined) => arr?.[arr.length - 1] ?? null;
}

/**
 * Implements transitioning between context values by mutating the context
 * object.
 * Unsafe from the cuncurrency standpoint.
 */
export class MutableAllureContextHolder implements AllureContextHolder<MutableAllureContext> {
  private readonly context: MutableAllureContext = new MutableAllureContext();

  get = () => this.context;

  addScope = (uuid: string) => {
    this.context.scopeStack.push(uuid);
  };

  removeScope = () => {
    this.context.scopeStack.pop();
  };

  removeScopeByUuid = (uuid: string) => MutableAllureContextHolder.removeAllOccurrences(this.context.scopeStack, uuid);

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
      MutableAllureContextHolder.removeAllOccurrences(steps, uuid);
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
}

/**
 * Stores the context in a class field. That's a simple but not async-safe way of
 * manipulating the context.
 */
export class StaticContextProvider<
  TContext extends AllureContext,
  THolder extends AllureContextHolder<TContext>,
> extends AllureContextProviderBase<TContext, THolder> {
  constructor(private readonly holderSingleton: THolder) {
    super();
  }

  protected override load = () => this.holderSingleton;

  /* The changes are already persisted in the holder singleton. */
  protected store = (holder: THolder) => {
    if (!Object.is(holder, this.holderSingleton)) {
      throw new Error("The static context holder can'be replaced with another one.");
    }
  };

  /**
   * Wraps a context holder singleton in the static context provider.
   * @param holderSingleton The singleton to wrap.
   */
  // eslint-disable-next-line @typescript-eslint/no-shadow
  static wrap = <TContext extends AllureContext, THolder extends AllureContextHolder<TContext>>(
    holderSingleton: THolder,
  ) => new StaticContextProvider<TContext, THolder>(holderSingleton);
}

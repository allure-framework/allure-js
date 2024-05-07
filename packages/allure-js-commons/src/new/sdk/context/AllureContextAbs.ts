/**
 * Represents a snapshot of the Allure state at some particular moment during the run.
 */
export type AllureContext = {
  getContainerStack: () => readonly string[];
  getFixture: () => string | null;
  getTest: () => string | null;
  getStepStack: (scope: string) => readonly string[];
};

/**
 * Implements the transitions from one snapshot to another.
 */
export type AllureContextBox = {
  get: () => AllureContext;

  addContainer: (uuid: string) => void;
  removeContainer: () => void;
  removeContainerByUuid: (uuid: string) => void;

  setFixture: (uuid: string) => void;
  removeFixture: () => void;

  setTest: (uuid: string) => void;
  removeTest: () => void;

  addStep: (scope: string, uuid: string) => void;
  removeStep: (scope: string) => void;
  removeStepByUuid: (scope: string, uuid: string) => void;
};

/**
 * Provides the set of methods to access and update the context.
 * Successor classes are responsible for persisting anc accessing the context.
 */
export abstract class AllureContextProvider {

  /**
   * Gets the box that contains the current value of the context.
   */
  protected abstract load: () => AllureContextBox;

  /**
   * Persist the changes applied to the context since it was last time persisted.
   */
  protected abstract store: () => void;

  /**
   * Gets the current container (i.e., the most recently added one).
   * @returns The UUID if the current container. If the container stack is empty, returns `null`.
   */
  getContainerStack = () => this.getCurrentContext().getContainerStack();

  /**
   * Gets the current container (i.e., the most recently added one).
   * @returns The UUID if the current container. If the container stack is empty, returns `null`.
   */
  getContainer = () => AllureContextProvider.last(this.getContainerStack());

  /**
   * Gets the current fixture, if any. Each fixture has its own stack of steps
   * separated from other tests and fixtures.
   */
  getFixture = () => this.getCurrentContext().getFixture();

  /**
   * Gets the current test, if any. Each test has its own stack of steps
   * separated from other tests and fixtures.
   */
  getTest = () => this.getCurrentContext().getTest();

  /**
   * Gets the current fixture if it exists. Otherwise returns the current test.
   * The returned value is the scope of steps that will be introduced if you call `addStep`.
   * @returns The UUID of the current step scope. If no such scope exists, returns `null`.
   */
  getStepScope = () => this.getFixture() ?? this.getTest();

  /**
   * Gets the current step.
   * @returns The UUID of the current step. If no step is currently executing, returns `null`.
   */
  getStep = () => {
    const scope = this.getStepScope();
    if (scope) {
      const steps = this.getStepStack(scope);
      if (steps) {
        return AllureContextProvider.last(steps);
      }
    }
    return null;
  };

  /**
   * Gets the currently executing step, fixture, or test.
   * The items are checked in that order and the first one that exists is returned.
   * @returns The UUID of the currently executing item. If no such item exists, returns `null`.
   */
  getExecutionItem = () => {
    const scope = this.getStepScope();
    if (scope) {
      const steps = this.getStepStack(scope);
      return AllureContextProvider.last(steps) ?? scope;
    }
    return null;
  };

  /**
   * Introduces a new container into the context. The container becomes the current one.
   * @param uuid The UUID of the new container.
   */
  addContainer = (uuid: string) => {
    this.load().addContainer(uuid);
    this.store();
  };

  /**
   * Removes the most recently added container from the context.
   * Has no effect if the container stack is empty.
   */
  removeContainer = () => {
    this.load().removeContainer();
    this.store();
  };

  /**
   * Applies the current fixture to the context.
   * @param uuid The UUID of the new fixture.
   */
  setFixture = (uuid: string) => {
    this.load().setFixture(uuid);
    this.store();
  };

  /**
   * Removes the current fixture from the context.
   * Subsequent calls to `getFixture` will return `null` until a new fixture is set.
   */
  removeFixture = () => {
    this.load().removeFixture();
    this.store();
  };

  /**
   * Applies the current test to the context.
   * @param uuid The UUID of the new test.
   */
  setTest = (uuid: string) => {
    this.load().setTest(uuid);
    this.store();
  };

  /**
   * Removes the current test from the context.
   * Subsequent calls to `getTest` will return `null` until a new test is set.
   */
  removeTest = () => {
    this.load().removeTest();
    this.store();
  };

  /**
   * Introduces a new step into the current fixture or test.
   * The step becomes the current step of that scope.
   * @param uuid The UUID of the new step.
   */
  addStep = (uuid: string) => {
    const scope = this.getStepScope();
    if (scope) {
      this.addStepToScope(scope, uuid);
    }
  };

  /**
   * Removes the step the most recently added to the current scope.
   * Has no effect if the current scope is not defined or contains no steps.
   */
  removeStep = () => {
    const scope = this.getStepScope();
    if (scope) {
      this.removeStepFromScope(scope);
    }
  };

  /*
   * Compatibility methods for manual UUID management.
   * Prefer using their UUID-less counterparts defined above
   */

  /**
   * Gets the UUID of the current step in a specific scope.
   * @param scope The UUID of a test or fixture.
   * @returns The UUID of the current step in the specified scope.
   * If no such step exists, returns `null`.
   */
  getStepOfScope = (scope: string) => {
    const steps = this.getStepStack(scope);
    return steps ? AllureContextProvider.last(steps) : null;
  };

  /**
   * Gets the UUID of the currently executing item of the specified test or fixture scope.
   * @param scope The UUID of a test or fixture.
   * @returns The UUID of the current step in the selected scope.
   * If no such step exists, returns the scope itself.
   */
  getExecutionItemByScope = (scope: string) => {
    const steps = this.getStepStack(scope);
    return AllureContextProvider.last(steps) ?? scope;
  };

  /**
   * Removes the specified UUID from the container stack.
   * @param uuid The UUID of a container to remove.
   */
  removeContainerByUuid = (uuid: string) => {
    if (this.getCurrentContext().getContainerStack().includes(uuid)) {
      this.load().removeContainerByUuid(uuid);
      this.store();
    }
  };

  /**
   * Removes the current fixture from the context if the UUID of that fixture
   * matches the provided UUID. Otherwise, the context remains intact.
   * @param uuid The UUID of a fixture to remove.
   */
  removeFixtureByUuid = (uuid: string) => {
    if (this.getFixture() === uuid) {
      this.removeFixture();
    }
  };

  /**
   * Removes the current test from the context if the UUID of that test
   * matches the provided UUID. Otherwise, the context remains intact.
   * @param uuid The UUID of a test to remove.
   */
  removeTestByUuid = (uuid: string) => {
    if (this.getTest() === uuid) {
      this.removeTest();
    }
  };

  /**
   * Applies a new step of the current step scope to the context.
   * The step becomes the current one in the current scope.
   * @param uuid The UUID of the new step.
   */
  addStepToScope = (scope: string, uuid: string) => {
    this.load().addStep(scope, uuid);
    this.store();
  };

  /**
   * Removes the current step of the provided fixture or test.
   * If no step is currently executing in the scope, the context remains intact.
   * @param uuid The UUID of a test or fixture to remove the current step from.
   */
  removeStepFromScope = (scope: string) => {
    const steps = this.getCurrentContext().getStepStack(scope);
    if (steps.length) {
      this.load().removeStep(scope);
      this.store();
    }
  };

  /** Removes the specified UUID from the step stack of the specified test or fixture scope.
   * @param scope The UUID of a test of fixture to remove the step from.
   * @param uuid The UUID of a step to remove.
   */
  removeStepFromScopeByUuid = (scope: string, uuid: string) => {
    const steps = this.getCurrentContext().getStepStack(scope);
    if (steps.includes(uuid)) {
      this.load().removeStepByUuid(scope, uuid);
      this.store();
    }
  };

  private getCurrentContext = () => this.load().get();

  private getStepStack = (scope: string) => this.getCurrentContext().getStepStack(scope);

  private static last = <T>(arr: readonly T[]) =>
    arr.length
      ? arr[arr.length - 1]
      : null;
};

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
export type AllureContextBox<TContext extends AllureContext> = {
  get: () => TContext;

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
 */
export type AllureContextProvider = {
  getContainerStack: () => readonly string[];
  getContainer: () => string | null;
  getFixture: () => string | null;
  getTest: () => string | null;
  getStepScope: () => string | null;
  getStep: () => string | null;
  getExecutionItem: () => string | null;
  addContainer: (uuid: string) => void;
  removeContainer: () => void;
  setFixture: (uuid: string) => void;
  removeFixture: () => void;
  setTest: (uuid: string) => void;
  removeTest: () => void;
  addStep: (uuid: string) => void;
  removeStep: () => void;

  /*
   * Methods for manual UUID management.
   */

  getStepOfScope: (scope: string) => string | null;
  getExecutionItemByScope: (scope: string) => string;
  removeContainerByUuid: (uuid: string) => void;
  removeFixtureByUuid: (uuid: string) => void;
  removeTestByUuid: (uuid: string) => void;
  addStepToScope: (scope: string, uuid: string) => void;
  removeStepFromScope: (scope: string) => void;
  removeStepFromScopeByUuid: (scope: string, uuid: string) => void;
};

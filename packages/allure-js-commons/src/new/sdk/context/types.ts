/**
 * Represents a snapshot of the Allure state at some particular moment during the run.
 */
export type AllureContext = {
  getScope: () => string | null;
  getFixture: () => string | null;
  getTest: () => string | null;
  getStep: (root: string) => string | null;
};

/**
 * Implements the transitions from one snapshot to another.
 */
export type AllureContextHolder<TContext extends AllureContext> = {
  get: () => TContext;

  addScope: (uuid: string) => void;
  removeScope: () => void;
  removeScopeByUuid: (uuid: string) => void;

  setFixture: (uuid: string) => void;
  removeFixture: () => void;

  setTest: (uuid: string) => void;
  removeTest: () => void;

  addStep: (root: string, uuid: string) => void;
  removeStep: (root: string) => void;
};

/**
 * Provides the set of methods to access and update the context.
 */
export type AllureContextProvider = {
  getScope: () => string | null;
  getFixture: () => string | null;
  getTest: () => string | null;
  getStepRoot: () => string | null;
  getStep: (root?: string) => string | null;
  getExecutingItem: (root?: string) => string | null;
  addScope: (uuid: string) => void;
  removeScope: (uuid?: string) => void;
  setFixture: (uuid: string) => void;
  removeFixture: (uuid?: string) => void;
  setTest: (uuid: string) => void;
  removeTest: (uuid?: string) => void;
  addStep: (uuid: string, root?: string) => void;
  removeStep: (root?: string, uuid?: string) => void;
};

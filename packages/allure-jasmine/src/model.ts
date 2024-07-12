export type JasmineBeforeAfterFn = typeof beforeEach;

export type TestPlanIndex = {
  ids: ReadonlySet<string>;
  fullNames: ReadonlySet<string>;
};

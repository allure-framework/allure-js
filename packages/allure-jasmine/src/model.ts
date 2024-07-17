export type JasmineBeforeAfterFn = typeof global.beforeEach;

export type JasmineSpecFn = typeof global.it;

export type JasmineSuiteFn = typeof global.describe;

export type TestPlanIndex = {
  ids: ReadonlySet<string>;
  fullNames: ReadonlySet<string>;
};

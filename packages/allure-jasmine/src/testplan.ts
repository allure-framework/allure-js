import path from "node:path";
import { fileURLToPath } from "node:url";
import { LabelName } from "allure-js-commons";
import type { Label } from "allure-js-commons";
import { addSkipLabelAsMeta, parseTestPlan } from "allure-js-commons/sdk/reporter";
import type { JasmineSpecFn, JasmineSuiteFn, TestPlanIndex } from "./model.js";
import { getAllureNamesAndLabels } from "./utils.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const getCallerFileStackTraceFormatFn = (_: Error, stackTraces: NodeJS.CallSite[]): string | undefined => {
  return stackTraces[0]?.getFileName();
};

const getCallerFile = <TFn extends (...args: any) => any>(fn: TFn) => {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = getCallerFileStackTraceFormatFn;
  try {
    const obj = {};
    Error.captureStackTrace(obj, fn);
    return (obj as any).stack as ReturnType<typeof getCallerFileStackTraceFormatFn>;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
};

const originalErrorToString = (e: Error) => Error.prototype.toString.call(e);

const defaultPrepareStackTrace = (error: Error, stackTraces: NodeJS.CallSite[]): string =>
  stackTraces.length === 0
    ? originalErrorToString(error)
    : [originalErrorToString(error), ...stackTraces].join("\n    at ");

const isAllureJasmineFrame = (frame: NodeJS.CallSite) => frame.getFileName()?.startsWith(dirname + path.sep) ?? false;

const createStackFilter =
  (prepareStackTrace: (error: Error, stackTraces: NodeJS.CallSite[]) => any) =>
  (error: Error, stackTraces: NodeJS.CallSite[]) =>
    prepareStackTrace(
      error,
      stackTraces.filter((frame) => !isAllureJasmineFrame(frame)),
    );

const hideAllureFramesFromFunc = <TArgs extends any[], TReturn, TFn extends (...args: TArgs) => TReturn>(
  target: TFn,
  ...args: TArgs
) => {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  const underlyingPrepareStackTrace = originalPrepareStackTrace ?? defaultPrepareStackTrace;
  Error.prepareStackTrace = createStackFilter(underlyingPrepareStackTrace);
  try {
    return target(...args);
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
};

const getIndexedTestPlan = (): TestPlanIndex | undefined => {
  const testplan = parseTestPlan();
  if (testplan) {
    return {
      ids: new Set(testplan.tests.filter((e) => e.id).map((e) => e.id!.toString())),
      fullNames: new Set(testplan.tests.filter((e) => e.selector).map((e) => e.selector!)),
    };
  }
};

const isInTestPlan = (testplan: TestPlanIndex | undefined, fullName: string | undefined, labels: readonly Label[]) => {
  if (!testplan) {
    return true;
  }
  if (fullName && testplan.fullNames.has(fullName)) {
    return true;
  }
  const allureId = labels.find((l) => l.name === LabelName.ALLURE_ID)?.value;
  return allureId && testplan.ids.has(allureId);
};

export const enableAllureJasmineTestPlan = () => {
  const jasmineDescribe: JasmineSuiteFn = global.describe;
  const jasmineIt: JasmineSpecFn = global.it;
  const jasmineXit: JasmineSpecFn = global.xit;

  const suites: string[] = [];
  let currentFile: string | undefined;
  const testplan = getIndexedTestPlan();

  global.describe = (description: string, specDefinitions: () => void) => {
    const callerFile = getCallerFile(global.describe);
    if (!callerFile) {
      return hideAllureFramesFromFunc(jasmineDescribe, description, specDefinitions);
    } else {
      if (callerFile !== currentFile) {
        currentFile = callerFile;
        suites.splice(0, suites.length);
      }

      suites.push(description);
      try {
        return hideAllureFramesFromFunc(jasmineDescribe, description, specDefinitions);
      } finally {
        suites.pop();
      }
    }
  };

  global.it = (expectation: string, assertion?: jasmine.ImplementationCallback, timeout?: number) => {
    const filename = currentFile ?? getCallerFile(global.it);
    const { fullName, labels } = getAllureNamesAndLabels(filename, suites, expectation);
    if (isInTestPlan(testplan, fullName, labels)) {
      return hideAllureFramesFromFunc(jasmineIt, expectation, assertion, timeout);
    } else {
      return hideAllureFramesFromFunc(jasmineXit, addSkipLabelAsMeta(expectation), assertion, timeout);
    }
  };
};

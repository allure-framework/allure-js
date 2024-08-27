import { ContentType, Status } from "allure-js-commons";
import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions, StatusDetails } from "allure-js-commons";
import {
  getMessageAndTraceFromError,
  getStatusFromError,
  getUnfinishedStepsMessages,
  isPromise,
} from "allure-js-commons/sdk";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import type {
  CypressCommand,
  CypressCommandEndMessage,
  CypressFailMessage,
  CypressHook,
  CypressMessage,
  CypressSuite,
  CypressSuiteFunction,
  CypressTest,
  DirectHookImplementation,
  HookImplementation,
} from "./model.js";
import { ALLURE_REPORT_STEP_COMMAND } from "./model.js";
import {
  dropCurrentTest,
  enqueueRuntimeMessage,
  getCurrentTest,
  getRuntimeMessages,
  setCurrentTest,
  setRuntimeMessages,
} from "./state.js";
import {
  getTestSkipData,
  getTestStartData,
  getTestStopData,
  isAllureHook,
  isTestReported,
  iterateTests,
  markTestAsReported,
  uint8ArrayToBase64,
} from "./utils.js";

export class AllureCypressTestRuntime implements TestRuntime {
  constructor() {
    this.#resetMessages();
  }

  labels(...labels: Label[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  links(...links: Link[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  description(markdown: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  descriptionHtml(html: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  displayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  historyId(value: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  testCaseId(value: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  // @ts-ignore
  attachment(name: string, content: string, options: AttachmentOptions) {
    // @ts-ignore
    const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
    const actualEncoding = typeof attachmentRawContent === "string" ? "utf8" : "base64";
    const attachmentContent = uint8ArrayToBase64(attachmentRawContent);

    return this.#enqueueMessageAsync({
      type: "attachment_content",
      data: {
        name,
        content: attachmentContent,
        encoding: actualEncoding,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  attachmentFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    return this.#enqueueMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  logStep(name: string, status: Status = Status.PASSED, error?: Error) {
    return cy
      .wrap(ALLURE_REPORT_STEP_COMMAND, { log: false })
      .then(() => {
        this.#enqueueMessageAsync({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        return Cypress.Promise.resolve();
      })
      .then(() => {
        return this.#enqueueMessageAsync({
          type: "step_stop",
          data: {
            status: status,
            stop: Date.now(),
            statusDetails: error ? { ...getMessageAndTraceFromError(error) } : undefined,
          },
        });
      });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(ALLURE_REPORT_STEP_COMMAND, { log: false })
      .then(() => {
        this.#enqueueMessageAsync({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        return this.#enqueueMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stop: Date.now(),
          },
        }).then(() => result);
      });
  }

  stepDisplayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        name,
      },
    });
  }

  stepParameter(name: string, value: string, mode?: ParameterMode) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  flushAllureMessagesToTask = (taskName: string) => {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      cy.task(taskName, { absolutePath: Cypress.spec.absolute, messages }, { log: false });
    }
  };

  flushAllureMessagesToTaskAsync = (taskName: string): Cypress.Chainable<unknown> | undefined => {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      return cy.task(taskName, { absolutePath: Cypress.spec.absolute, messages }, { log: false });
    }
  };

  #resetMessages = () => setRuntimeMessages([]);

  #enqueueMessageAsync = (message: CypressMessage): PromiseLike<void> => {
    enqueueRuntimeMessage(message);
    return Cypress.Promise.resolve();
  };

  #dequeueAllMessages = () => {
    const messages = getRuntimeMessages();
    this.#resetMessages();
    return messages;
  };
}

export const initTestRuntime = () => setGlobalTestRuntime(new AllureCypressTestRuntime() as TestRuntime);

export const getTestRuntime = () => getGlobalTestRuntime() as AllureCypressTestRuntime;

export const reportRunStart = () => {
  enqueueRuntimeMessage({
    type: "cypress_run_start",
    data: {},
  });
};

export const reportSuiteStart = (suite: CypressSuite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_start",
    data: {
      name: suite.title,
      root: suite.root,
      start: Date.now(),
    },
  });
};

export const reportSuiteEnd = (suite: CypressSuite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_end",
    data: {
      root: suite.root,
      stop: Date.now(),
    },
  });
};

export const reportHookStart = (hook: CypressHook, start?: number) => {
  enqueueRuntimeMessage({
    type: "cypress_hook_start",
    data: {
      name: hook.title,
      scopeType: hook.hookName.includes("each") ? "each" : "all",
      position: hook.hookName.includes("before") ? "before" : "after",
      start: start ?? Date.now(),
    },
  });
};

export const reportHookEnd = (hook: CypressHook) => {
  enqueueRuntimeMessage({
    type: "cypress_hook_end",
    data: {
      duration: hook.duration ?? 0,
    },
  });
};

export const reportTestStart = (test: CypressTest) => {
  setCurrentTest(test);
  enqueueRuntimeMessage({
    type: "cypress_test_start",
    data: getTestStartData(test),
  });
  markTestAsReported(test);
};

export const reportUnfinishedSteps = (status: Status, statusDetails?: StatusDetails) => {
  const runtimeMessages = getRuntimeMessages() as RuntimeMessage[];
  const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages);
  unfinishedStepsMessages.forEach(() => {
    enqueueRuntimeMessage({
      type: "step_stop",
      data: {
        stop: Date.now(),
        status,
        statusDetails,
      },
    });
  });
};

export const reportTestPass = () => {
  reportUnfinishedSteps(Status.PASSED);
  enqueueRuntimeMessage({
    type: "cypress_test_pass",
    data: {},
  });
};

export const reportTestSkip = (test: CypressTest) => {
  if (isTestReported(test)) {
    reportUnfinishedCommand(Status.SKIPPED, {
      message: "The test was skipped before the command was completed",
    });
  } else {
    reportTestStart(test);
  }

  enqueueRuntimeMessage({
    type: "cypress_test_skip",
    data: getTestSkipData(),
  });
};

export const reportCommandStart = (command: CypressCommand) => {
  enqueueRuntimeMessage({
    type: "cypress_command_start",
    data: {
      name: `Command "${command.attributes.name}"`,
      args: command.attributes.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2))),
      start: Date.now(),
    },
  });
};

export const reportCommandEnd = () => {
  enqueueRuntimeMessage({
    type: "cypress_command_end",
    data: {
      status: Status.PASSED,
      stop: Date.now(),
    },
  });
};

export const reportScreenshot = (path: string, name: string) => {
  enqueueRuntimeMessage({
    type: "attachment_path",
    data: {
      path: path,
      name: name || "Screenshot",
      contentType: ContentType.PNG,
    },
  });
};

export const reportUnfinishedCommand = (status: Status, statusDetails?: StatusDetails) => {
  const runtimeMessages = getRuntimeMessages();
  const startCommandMessageIdx = runtimeMessages.toReversed().findIndex(({ type }) => type === "cypress_command_start");
  const stopCommandMessageIdx = runtimeMessages.toReversed().findIndex(({ type }) => type === "cypress_command_end");
  const hasUnfinishedCommand = startCommandMessageIdx > stopCommandMessageIdx;

  const data: CypressCommandEndMessage["data"] = { status, stop: Date.now() };
  if (statusDetails) {
    data.statusDetails = statusDetails;
  }

  if (hasUnfinishedCommand) {
    enqueueRuntimeMessage({ type: "cypress_command_end", data });
  }
};

export const reportTestOrHookFail = (err: Error) => {
  const status = getStatusFromError(err);
  const statusDetails = getMessageAndTraceFromError(err);

  reportUnfinishedCommand(status, statusDetails);

  enqueueRuntimeMessage({
    type: "cypress_fail",
    data: {
      status,
      statusDetails,
    },
  });
};

export const reportTestEnd = (test: CypressTest) => {
  enqueueRuntimeMessage({
    type: "cypress_test_end",
    data: {
      duration: test.duration ?? 0,
      retries: (test as any)._retries ?? 0,
    },
  });
  dropCurrentTest();
};

export const completeHookErrorReporting = (hook: CypressHook, err: Error) => {
  const hookName = hook.hookName;
  const isEachHook = hookName.includes("each");
  const suite = hook.parent!;
  const testFailData = getStatusDataOfTestSkippedByHookError(hookName, isEachHook, err, suite);

  // Cypress doens't emit 'hook end' if the hook has failed.
  reportHookEnd(hook);

  // Cypress doens't emit 'test end' if the hook has failed.
  // We must report the test's end manualy in case of a 'before each' hook.
  reportCurrentTestIfAny();

  // Cypress skips the remaining tests in the suite of a failed hook.
  // We should include them to the report manually.
  reportRemainingTests(suite, testFailData);
};

/**
 * Patches the `after` function, to inject an extra `after` hook after each spec-level
 * `after` hook defined by the user.
 */
export const enableScopeLevelAfterHookReporting = () => {
  const [getSuiteDepth, incSuiteDepth, decSuiteDepth] = createSuiteDepthCounterState();
  patchDescribe(incSuiteDepth, decSuiteDepth);
  patchAfter(getSuiteDepth);
};

export const flushRuntimeMessages = () => getTestRuntime().flushAllureMessagesToTask("reportAllureCypressSpecMessages");

export const completeSpec = () =>
  getTestRuntime().flushAllureMessagesToTaskAsync("reportFinalAllureCypressSpecMessages");

export const completeSpecIfNoAfterHookLeft = (context: Mocha.Context) => {
  if (isLastRootAfterHook(context)) {
    const hook = context.test as CypressHook;
    if (!isAllureHook(hook)) {
      reportHookEnd(hook);
    }
    return completeSpec();
  }
};

const completeSpecOnAfterHookFailure = (
  context: Mocha.Context,
  hookError: Error,
): Cypress.Chainable<unknown> | undefined => {
  try {
    reportTestOrHookFail(hookError);
    completeHookErrorReporting(context.test as CypressHook, hookError);

    // cy.task's then doesn't have onrejected, that's why we don't log async Allure errors here.
    return completeSpec();
  } catch (allureError) {
    logAllureRootAfterError(context, allureError);
  }
};

const reportCurrentTestIfAny = () => {
  const currentTest = getCurrentTest();
  if (currentTest) {
    reportTestEnd(currentTest);
  }
};

const reportRemainingTests = (suite: CypressSuite, testFailData: CypressFailMessage["data"]) => {
  for (const test of iterateTests(suite)) {
    // Some tests in the suite might've been already reported.
    if (!isTestReported(test)) {
      reportTestsSkippedByHookError(
        test,
        test.pending ? { ...getTestSkipData(), status: Status.SKIPPED } : testFailData,
      );
    }
  }
};

const reportTestsSkippedByHookError = (test: CypressTest, testFailData: CypressFailMessage["data"]) => {
  enqueueRuntimeMessage({
    type: "cypress_skipped_test",
    data: {
      ...getTestStartData(test),
      ...testFailData,
      ...getTestStopData(test),
    },
  });
  markTestAsReported(test);
};

const getStatusDataOfTestSkippedByHookError = (
  hookName: string,
  isEachHook: boolean,
  err: Error,
  suite: Mocha.Suite,
) => {
  const status = isEachHook ? Status.SKIPPED : getStatusFromError(err);
  const { message, trace } = getMessageAndTraceFromError(err);
  return {
    status,
    statusDetails: {
      message: isEachHook ? getSkipReason(hookName, suite) : message,
      trace,
    },
  };
};

const getSkipReason = (hookName: string, suite: Mocha.Suite) => {
  const suiteName = suite.title ? suite.title : "root";
  return `'${hookName}' of suite '${suiteName}' failed for one of the previous tests`;
};

const forwardDescribeCall = (target: CypressSuiteFunction, ...args: Parameters<CypressSuiteFunction>) => {
  const [title, configOrFn, fn] = args;
  if (typeof fn === "undefined" && typeof configOrFn === "undefined") {
    return target(title);
  } else if (typeof configOrFn === "function") {
    return target(title, configOrFn);
  } else {
    return target(title, configOrFn, fn);
  }
};

const patchDescribe = (incSuiteDepth: () => void, decSuiteDepth: () => void) => {
  const patchDescribeFn =
    (target: CypressSuiteFunction): CypressSuiteFunction =>
    (title, configOrFn, fn) => {
      incSuiteDepth();
      try {
        return forwardDescribeCall(target, title, configOrFn, fn);
      } finally {
        decSuiteDepth();
      }
    };
  const originalDescribeFn: Mocha.SuiteFunction = globalThis.describe;
  const patchedDescribe = patchDescribeFn(originalDescribeFn) as Mocha.SuiteFunction;
  patchedDescribe.only = patchDescribeFn(
    originalDescribeFn.only as CypressSuiteFunction,
  ) as Mocha.ExclusiveSuiteFunction;
  patchedDescribe.skip = patchDescribeFn(originalDescribeFn.skip as CypressSuiteFunction) as Mocha.PendingSuiteFunction;
  globalThis.describe = patchedDescribe;
};

const createSuiteDepthCounterState = (): [get: () => number, inc: () => void, dec: () => void] => {
  let suiteDepth = 0;
  return [
    () => suiteDepth,
    () => {
      suiteDepth++;
    },
    () => {
      suiteDepth--;
    },
  ];
};

const patchAfter = (getSuiteDepth: () => number) => {
  const originalAfter = globalThis.after;
  const patchedAfter = (nameOrFn: string | HookImplementation, fn?: HookImplementation): void => {
    return typeof nameOrFn === "string"
      ? originalAfter(nameOrFn, wrapRootAfterFn(getSuiteDepth, fn))
      : originalAfter(wrapRootAfterFn(getSuiteDepth, nameOrFn)!);
  };
  globalThis.after = patchedAfter;
};

const wrapRootAfterFn = (getSuiteDepth: () => number, fn?: HookImplementation): HookImplementation | undefined => {
  if (getSuiteDepth() === 0 && fn) {
    const wrappedFn = fn.length ? wrapAfterFnWithCallback(fn) : wrapAfterFnWithoutArgs(fn as DirectHookImplementation);
    Object.defineProperty(wrappedFn, "name", { value: fn.name });
    return wrappedFn;
  }
  return fn;
};

const wrapAfterFnWithCallback = (fn: Mocha.Func): Mocha.Func => {
  return function (this: Mocha.Context, done: Mocha.Done) {
    const wrappedDone = (hookError?: Error) => {
      if (hookError) {
        if (!completeSpecOnAfterHookFailure(this, hookError)?.then(() => done(hookError))) {
          done(hookError);
        }
        return;
      }

      try {
        if (completeSpecIfNoAfterHookLeft(this)?.then(() => done())) {
          return;
        }
      } catch (allureError) {
        done(allureError);
        return;
      }

      done();
    };
    return fn.bind(this)(wrappedDone);
  };
};

const wrapAfterFnWithoutArgs = (fn: DirectHookImplementation) => {
  return function (this: Mocha.Context) {
    let result;
    let syncError: any;

    try {
      result = fn.bind(this)();
    } catch (e) {
      syncError = e;
    }

    if (syncError) {
      throwAfterSpecCompletion(this, syncError);
    } else if (isPromise(result)) {
      return result.then(
        () => completeSpecIfNoAfterHookLeft(this),
        (asyncError) => throwAfterSpecCompletion(this, asyncError),
      );
    } else {
      completeSpecIfNoAfterHookLeft(this);
      return result;
    }
  };
};

const throwAfterSpecCompletion = (context: Mocha.Context, err: any) => {
  const chain = completeSpecOnAfterHookFailure(context, err as Error)?.then(() => {
    throw err;
  });
  if (!chain) {
    throw err;
  }
};

const logAllureRootAfterError = (context: Mocha.Context, err: unknown) => {
  // We play safe and swallow errors here to keep the original 'after all' error.
  try {
    // eslint-disable-next-line no-console
    console.error(`Unexpected error when reporting the failure of ${context.test?.title ?? "'after all'"}`);
    // eslint-disable-next-line no-console
    console.error(err);
  } catch {}
};

const isLastRootAfterHook = (context: Mocha.Context) => {
  const currentAfterAll = context.test as CypressHook;
  const rootSuite = (context.test as CypressHook).parent!;
  const hooks = (rootSuite as any).hooks as CypressHook[];
  const lastAfterAll = hooks.findLast((h) => h.hookName === "after all");
  return lastAfterAll?.hookId === currentAfterAll.hookId;
};

import { ContentType, Status } from "allure-js-commons";
import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions, StatusDetails } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError, getUnfinishedStepsMessages } from "allure-js-commons/sdk";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import type {
  CypressCommand,
  CypressCommandEndMessage,
  CypressMessage,
  CypressSuiteFunction,
  CypressTest,
} from "./model.js";
import { ALLURE_REPORT_STEP_COMMAND, ALLURE_REPORT_SYSTEM_HOOK } from "./model.js";
import { enqueueRuntimeMessage, getRuntimeMessages, setRuntimeMessages } from "./state.js";
import { getNamesAndLabels, isTestReported, markTestAsReported, uint8ArrayToBase64 } from "./utils.js";

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

  flushMessages = (): PromiseLike<void> => this.#moveMessagesToAllureCypressTask("reportAllureCypressSpecMessages");

  flushFinalMessages = (): PromiseLike<void> =>
    this.#moveMessagesToAllureCypressTask("reportFinalAllureCypressSpecMessages");

  #moveMessagesToAllureCypressTask = (taskName: string) => {
    const messages = this.#dequeueAllMessages();
    return messages.length
      ? cy.task(taskName, { absolutePath: Cypress.spec.absolute, messages }, { log: false })
      : Cypress.Promise.resolve();
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

export const flushRuntimeMessages = () => getTestRuntime().flushMessages();

export const flushFinalRuntimeMessages = () => getTestRuntime().flushFinalMessages();

export const reportRunStart = () => {
  enqueueRuntimeMessage({
    type: "cypress_run_start",
    data: {},
  });
};

export const reportSuiteStart = (suite: Mocha.Suite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_start",
    data: {
      name: suite.title,
      root: !suite.parent,
      start: Date.now(),
    },
  });
};

export const reportSuiteEnd = (suite: Mocha.Suite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_end",
    data: {
      root: !suite.parent,
      stop: Date.now(),
    },
  });
};

export const reportHookStart = (hook: Mocha.Hook) => {
  enqueueRuntimeMessage({
    type: "cypress_hook_start",
    data: {
      name: hook.title,
      start: Date.now(),
    },
  });
};

export const reportHookEnd = (hook: Mocha.Hook) => {
  enqueueRuntimeMessage({
    type: "cypress_hook_end",
    data: {
      duration: hook.duration ?? 0,
    },
  });
};

export const reportTestStart = (test: CypressTest, flag?: string) => {
  const x = getNamesAndLabels(Cypress.spec, test);
  if (flag) {
    x.labels.push({ name: "reported", value: flag });
  }
  enqueueRuntimeMessage({
    type: "cypress_test_start",
    data: {
      ...x,
      start: test.wallClockStartedAt?.getTime() || Date.now(),
    },
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
    data: {},
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
  const patchedAfter = (nameOrFn: string | Mocha.Func | Mocha.AsyncFunc, fn?: Mocha.Func | Mocha.AsyncFunc): void => {
    try {
      return typeof nameOrFn === "string" ? originalAfter(nameOrFn, fn) : originalAfter(nameOrFn);
    } finally {
      if (getSuiteDepth() === 0) {
        originalAfter(ALLURE_REPORT_SYSTEM_HOOK, () => {
          flushRuntimeMessages();
        });
      }
    }
  };
  globalThis.after = patchedAfter;
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

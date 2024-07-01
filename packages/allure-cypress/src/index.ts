import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions, StatusDetails } from "allure-js-commons";
import { ContentType, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getUnfinishedStepsMessages, hasStepMessage } from "allure-js-commons/sdk";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type {
  CypressCommand,
  CypressCommandStartMessage,
  CypressHook,
  CypressHookStartMessage,
  CypressMessage,
  CypressTest,
  CypressTestStartMessage,
} from "./model.js";
import { ALLURE_REPORT_SHUTDOWN_HOOK, ALLURE_REPORT_STEP_COMMAND } from "./model.js";
import {
  getHookType,
  getSuitePath,
  isCommandShouldBeSkipped,
  isGlobalHook,
  toReversed,
  uint8ArrayToBase64,
} from "./utils.js";

export class AllureCypressTestRuntime implements TestRuntime {
  labels(...labels: Label[]) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  links(...links: Link[]) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions) {
    return this.sendMessageAsync({
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
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  descriptionHtml(html: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  displayName(name: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  historyId(value: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  testCaseId(value: string) {
    return this.sendMessageAsync({
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

    return this.sendMessageAsync({
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
    return this.sendMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(ALLURE_REPORT_STEP_COMMAND, { log: false })
      .then(() => {
        this.sendMessage({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        return this.sendMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stop: Date.now(),
          },
        }).then(() => result);
      });
  }

  stepDisplayName(name: string) {
    return this.sendMessageAsync({
      type: "step_metadata",
      data: {
        name,
      },
    });
  }

  stepParameter(name: string, value: string, mode?: ParameterMode) {
    return this.sendMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  sendMessage(message: CypressMessage) {
    const messages = Cypress.env("allureRuntimeMessages") || [];

    Cypress.env("allureRuntimeMessages", messages.concat(message));
  }

  sendMessageAsync({ type, data }: CypressMessage): PromiseLike<void> {
    this.sendMessage({
      type,
      data: {
        ...data,
        // a little hack to avoid additional types definition
        // @ts-ignore
        cypressTestId: Cypress.state("test")?.id ?? "",
      },
    });

    return Cypress.Promise.resolve();
  }
}

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
} = Mocha.Runner.constants;

const initializeAllure = () => {
  const initialized = Cypress.env("allureInitialized") as boolean;

  if (initialized) {
    return;
  }

  Cypress.env("allureInitialized", true);

  // @ts-ignore
  Cypress.mocha
    .getRunner()
    .on(EVENT_RUN_BEGIN, () => {
      const testRuntime = new AllureCypressTestRuntime();

      Cypress.env("allureRuntimeMessages", []);

      // @ts-ignore
      setGlobalTestRuntime(testRuntime);
    })
    .on(EVENT_HOOK_BEGIN, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SHUTDOWN_HOOK)) {
        return;
      }

      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
      // @ts-ignore
      const testId: string | undefined = Cypress.state()?.test?.id;

      testRuntime.sendMessageAsync({
        type: "cypress_hook_start",
        data: {
          id: testId ? `${testId}:${hook.hookId}` : "",
          parentId: hook.parent.id,
          name: hook.title,
          type: getHookType(hook.title),
          start: Date.now(),
          global: isGlobalHook(hook.title),
        },
      });
    })
    .on(EVENT_HOOK_END, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SHUTDOWN_HOOK)) {
        return;
      }

      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
      const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressMessage[];
      const hookStartMessage = toReversed(runtimeMessages).find(
        ({ type }) => type === "cypress_hook_start",
      ) as CypressHookStartMessage;

      if (!hookStartMessage.data.id) {
        hookStartMessage.data.id = `${hook.id}:${hook.hookId}`;
      }

      return testRuntime.sendMessageAsync({
        type: "cypress_hook_end",
        data: {
          id: hookStartMessage.data.id,
          parentId: hook.parent.id,
          status: Status.PASSED,
          stop: hookStartMessage.data.start + (hook.duration ?? 0),
          global: isGlobalHook(hook.title),
        },
      });
    })
    .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      return testRuntime.sendMessageAsync({
        type: "cypress_suite_start",
        data: {
          id: suite.titlePath().join(" "),
          name: suite.title,
        },
      });
    })
    .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      return testRuntime.sendMessageAsync({
        type: "cypress_suite_end",
        data: {
          id: suite.titlePath().join(" "),
        },
      });
    })
    .on(EVENT_TEST_BEGIN, (test: CypressTest) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      testRuntime.sendMessage({
        type: "cypress_test_start",
        data: {
          id: test.id,
          specPath: getSuitePath(test).concat(test.title),
          filename: Cypress.spec.relative,
          start: test.wallClockStartedAt?.getTime() || Date.now(),
        },
      });
    })
    .on(EVENT_TEST_PASS, (test: CypressTest) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
      const runtimeMessages = Cypress.env("allureRuntimeMessages") as RuntimeMessage[];
      const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages);

      unfinishedStepsMessages.forEach(() => {
        testRuntime.sendMessage({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stop: Date.now(),
          },
        });
      });
      testRuntime.sendMessage({
        type: "cypress_test_end",
        data: {
          id: test.id,
          status: Status.PASSED,
          stop: Date.now(),
        },
      });
    })
    .on(EVENT_TEST_FAIL, (test: CypressTest, err: Error) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
      const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressMessage[];
      const startCommandMessageIdx = runtimeMessages
        .toReversed()
        .findIndex(({ type }) => type === "cypress_command_start");
      const stopCommandMessageIdx = runtimeMessages
        .toReversed()
        .findIndex(({ type }) => type === "cypress_command_end");
      const hasUnfinishedCommand = startCommandMessageIdx > stopCommandMessageIdx;
      const status = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;
      const statusDetails: StatusDetails = {
        message: err.message,
        trace: err.stack,
      };

      if (hasUnfinishedCommand) {
        testRuntime.sendMessage({
          type: "cypress_command_end",
          data: {
            id: (runtimeMessages[startCommandMessageIdx] as CypressCommandStartMessage).data.id,
            status,
            statusDetails,
          },
        });
      }

      if (test.hookName) {
        const hookStartMessage = runtimeMessages
          .toReversed()
          .find(({ type }) => type === "cypress_hook_start") as CypressHookStartMessage;

        return testRuntime.sendMessageAsync({
          type: "cypress_hook_end",
          data: {
            id: hookStartMessage.data.id,
            status,
            statusDetails,
            stop: hookStartMessage.data.start + (test.duration ?? 0),
            parentId: hookStartMessage.data.parentId,
            global: isGlobalHook(test.hookName),
          },
        });
      }

      // the test hasn't been even started (rather due to hook error), so we need to start it manually
      if (!test.hookName && test.wallClockStartedAt === undefined) {
        testRuntime.sendMessage({
          type: "cypress_test_start",
          data: {
            id: test.id,
            specPath: getSuitePath(test).concat(test.title),
            filename: Cypress.spec.relative,
            start: Date.now(),
          },
        });
      }

      const testStartMessage = toReversed(runtimeMessages).find(
        ({ type }) => type === "cypress_test_start",
      ) as CypressTestStartMessage;

      testRuntime.sendMessage({
        type: "cypress_test_end",
        data: {
          id: test.id,
          status,
          statusDetails,
          stop: testStartMessage.data.start + (test.duration ?? 0),
        },
      });
    })
    .on(EVENT_RUN_END, () => {
      // this is the only way to say reporter process messages in interactive mode without data duplication
      if (Cypress.config("isInteractive")) {
        cy.task("allureReportSpec", { absolute: Cypress.spec.absolute });
      }
    });

  Cypress.Screenshot.defaults({
    onAfterScreenshot: (_, details) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      return testRuntime.sendMessageAsync({
        type: "attachment_path",
        data: {
          path: details.path,
          name: details.name || "Screenshot",
          contentType: ContentType.PNG,
        },
      });
    },
  });

  Cypress.on("fail", (err) => {
    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
    const runtimeMessages = Cypress.env("allureRuntimeMessages") as RuntimeMessage[];
    const hasSteps = hasStepMessage(runtimeMessages);

    // if there is no steps, don't handle the error
    if (!hasSteps) {
      throw err;
    }

    const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages);

    if (unfinishedStepsMessages.length === 0) {
      throw err;
    }

    const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

    unfinishedStepsMessages.forEach(() => {
      testRuntime.sendMessage({
        type: "step_stop",
        data: {
          status: failedStepsStatus,
          stop: Date.now(),
          statusDetails: {
            message: err.message,
            trace: err.stack,
          },
        },
      });
    });

    throw err;
  });
  Cypress.on("command:start", (command: CypressCommand) => {
    if (isCommandShouldBeSkipped(command)) {
      return;
    }

    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

    return testRuntime.sendMessageAsync({
      type: "cypress_command_start",
      data: {
        id: command.attributes.id,
        name: `Command "${command.attributes.name}"`,
        args: command.attributes.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2))),
      },
    });
  });
  Cypress.on("command:end", (command: CypressCommand) => {
    if (isCommandShouldBeSkipped(command)) {
      return;
    }

    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

    return testRuntime.sendMessageAsync({
      type: "cypress_command_end",
      data: {
        id: command.attributes.id,
        status: Status.PASSED,
      },
    });
  });

  after(ALLURE_REPORT_SHUTDOWN_HOOK, () => {
    const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressMessage[];

    cy.task(
      "allureReportTest",
      { absolutePath: Cypress.spec.absolute, messages: runtimeMessages ?? [] },
      { log: false },
    );
  });
};

initializeAllure();

export * from "allure-js-commons";

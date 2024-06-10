import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions } from "allure-js-commons";
import { ContentType, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getUnfinishedStepsMessages, hasStepMessage } from "allure-js-commons/sdk";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type {
  CypressHook,
  CypressRuntimeMessage,
  CypressTest,
  CypressTestStartRuntimeMessage
} from "./model.js";
import { ALLURE_REPORT_INSTALL_HOOK } from "./model.js";
import { getSuitePath, normalizeAttachmentContentEncoding, uint8ArrayToBase64, getCypressSuiteHooks } from "./utils.js";

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

  attachment(name: string, content: Buffer | string, options: AttachmentOptions) {
    // @ts-ignore
    const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
    const encoding = content instanceof Buffer ? "base64" : "utf-8";
    const actualEncoding = normalizeAttachmentContentEncoding(attachmentRawContent, encoding);
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
      .wrap(null, { log: false })
      .then(() => {
        this.sendMessage({
          type: "step_start",
          data: { name, start: Date.now() },
        });

        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        return this.sendMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stage: Stage.FINISHED,
            stop: Date.now(),
          },
        }).then(() => result);
      });
  }

  stepDisplayName(name: string) {
    return this.sendMessageAsync({
      type: "step_metadata",
      data: { name },
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

  sendMessage(message: CypressRuntimeMessage) {
    const messages = Cypress.env("allureRuntimeMessages") || [];

    Cypress.env("allureRuntimeMessages", messages.concat(message));
  }

  sendMessageAsync(message: CypressRuntimeMessage): PromiseLike<void> {
    this.sendMessage(message);
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

  // @ts-ignore
  Cypress.mocha
    .getRunner()
    .on(EVENT_RUN_BEGIN, () => {
      const testRuntime = new AllureCypressTestRuntime();

      Cypress.env("allureRuntimeMessages", []);

      setGlobalTestRuntime(testRuntime);
    })
    //#region
    // .on(EVENT_HOOK_BEGIN, (hook: CypressHook) => {
    //   const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
    //
    //   testRuntime.sendMessageAsync({
    //     type: "cypress_hook_start",
    //     data: {
    //       type: /before/i.test(hook.hookName) ? "before" : "after",
    //       name: hook.hookName,
    //       start: Date.now(),
    //     },
    //   });
    //
    //   // if hook contains state – it has been already finished
    //   if (!hook.state) {
    //     return;
    //   }
    //
    //   return testRuntime.sendMessageAsync({
    //     type: "cypress_hook_end",
    //     data: {
    //       status: hook.state === "failed" ? Status.BROKEN : Status.PASSED,
    //       statusDetails: hook.err && {
    //         message: hook.err.message,
    //         trace: hook.err.stack,
    //       },
    //       stage: Stage.FINISHED,
    //       stop: Date.now(),
    //     },
    //   });
    // })
    // .on(EVENT_HOOK_END, () => {
    //   const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
    //
    //   return testRuntime.sendMessageAsync({
    //     type: "cypress_hook_end",
    //     data: {
    //       stage: Stage.FINISHED,
    //       status: Status.PASSED,
    //       stop: Date.now(),
    //     },
    //   });
    // })
    //#endregion
    .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      return testRuntime.sendMessageAsync({
        type: "cypress_suite_start",
        data: {
          name: suite.title,
        }
      })
    })
    .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      return testRuntime.sendMessageAsync({
        type: "cypress_suite_end",
        data: {
          hooks: getCypressSuiteHooks(suite),
        }
      })
    })
    .on(EVENT_TEST_BEGIN, (test: CypressTest) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      testRuntime.sendMessage({
        type: "cypress_start",
        data: {
          isInteractive: Cypress.config("isInteractive"),
          absolutePath: Cypress.spec.absolute,
          specPath: getSuitePath(test).concat(test.title),
          filename: Cypress.spec.relative,
          start: test.wallClockStartedAt?.getTime() || Date.now(),
        },
      });
    })
    .on(EVENT_TEST_PASS, (test: CypressTest) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
      const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
      const startMessage = runtimeMessages.toReversed().find(({ type }) => type === "cypress_start")!
      const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

      unfinishedStepsMessages.forEach(() => {
        testRuntime.sendMessage({
          type: "step_stop",
          data: {
            stage: Stage.FINISHED,
            status: Status.PASSED,
            stop: Date.now(),
          },
        });
      });
      testRuntime.sendMessage({
        type: "cypress_end",
        data: {
          stage: Stage.FINISHED,
          status: Status.PASSED,
          stop: Date.now(),
        },
      });
    })
    .on(EVENT_TEST_FAIL, (test: CypressTest, err: Error) => {
      const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

      // the test hasn't been even started (rather due to hook error), so we need to start it manually
      if (test.wallClockStartedAt === undefined) {
        testRuntime.sendMessage({
          type: "cypress_start",
          data: {
            isInteractive: Cypress.config("isInteractive"),
            absolutePath: Cypress.spec.absolute,
            specPath: getSuitePath(test).concat(test.title),
            filename: Cypress.spec.relative,
            start: Date.now(),
          },
        });
      }

      const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
      const startMessage = runtimeMessages.toReversed().find(({ type }) => type === "cypress_start") as CypressTestStartRuntimeMessage

      testRuntime.sendMessage({
        type: "cypress_end",
        data: {
          stage: Stage.FINISHED,
          status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
          statusDetails: {
            message: err.message,
            trace: err.stack,
          },
          stop: startMessage.data.start + (test.duration || 0),
        },
      });
    })
    .on(EVENT_RUN_END, () => {
      const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];

      cy.task("allureReportTest", runtimeMessages, { log: false });
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
    const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
    const hasSteps = hasStepMessage(runtimeMessages as RuntimeMessage[]);

    // if there is no steps, don't handle the error
    if (!hasSteps) {
      throw err;
    }

    const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

    if (unfinishedStepsMessages.length === 0) {
      throw err;
    }

    const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

    unfinishedStepsMessages.forEach(() => {
      testRuntime.sendMessage({
        type: "step_stop",
        data: {
          stage: Stage.FINISHED,
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

  Cypress.env("allureInitialized", true);
};

initializeAllure();

export * from "allure-js-commons";

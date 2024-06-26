import type Cypress from "cypress";
import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { FileSystemWriter, ReporterRuntime, getSuiteLabels } from "allure-js-commons/sdk/reporter";
import type {
  CypressHookEndRuntimeMessage,
  CypressHookStartRuntimeMessage,
  CypressRuntimeMessage,
  CypressTestStartRuntimeMessage,
} from "./model.js";

export type AllureCypressConfig = {
  resultsDir?: string;
};

export class AllureCypress {
  allureRuntime: ReporterRuntime;

  testsUuidsByCypressAbsolutePath = new Map<string, string[]>();

  globalHooksMessages: CypressRuntimeMessage[] = [];

  constructor(config?: AllureCypressConfig) {
    const { resultsDir = "./allure-results", ...rest } = config || {};

    this.allureRuntime = new ReporterRuntime({
      writer: new FileSystemWriter({
        resultsDir,
      }),
      ...rest,
    });
  }

  private pushTestUuid(absolutePath: string, uuid: string) {
    const currentUuids = this.testsUuidsByCypressAbsolutePath.get(absolutePath) || [];

    this.testsUuidsByCypressAbsolutePath.set(absolutePath, currentUuids.concat(uuid));
  }

  attachToCypress(on: Cypress.PluginEvents) {
    on("task", {
      allureReportTest: (messages: CypressRuntimeMessage[]) => {
        let currentTestUuid: string;
        let currentTestStartMessage: CypressTestStartRuntimeMessage;

        this.globalHooksMessages = [];

        messages.forEach((message, i) => {
          const previousMessagesSlice = messages.slice(0, i);
          let lastHookMessage!: CypressHookStartRuntimeMessage | CypressHookEndRuntimeMessage;

          for (let j = previousMessagesSlice.length - 1; j >= 0; j--) {
            const previousMessage = previousMessagesSlice[j];

            if (previousMessage.type === "cypress_hook_start") {
              lastHookMessage = previousMessagesSlice[j] as CypressHookStartRuntimeMessage;
              break;
            }

            if (previousMessage.type === "cypress_hook_end") {
              lastHookMessage = previousMessagesSlice[j] as CypressHookEndRuntimeMessage;
              break;
            }
          }

          if (message.type === "cypress_suite_start") {
            this.allureRuntime.startScope();
            return;
          }

          if (message.type === "cypress_suite_end") {
            this.allureRuntime.stopScope();
            return;
          }

          if (message.type === "cypress_hook_start" && message.data.global) {
            this.globalHooksMessages.push(message);
            return;
          }

          if (message.type === "cypress_hook_start") {
            this.allureRuntime.startFixture(message.data.type, {
              name: message.data.name,
              start: message.data.start,
            });
            return;
          }

          if (
            message.type === "cypress_hook_end" &&
            (lastHookMessage as CypressHookStartRuntimeMessage)?.data?.global &&
            lastHookMessage?.type === "cypress_hook_start"
          ) {
            this.globalHooksMessages.push(message);
            return;
          }

          if (message.type === "cypress_hook_end") {
            this.allureRuntime.updateFixture((r) => {
              r.stage = message.data.stage;
              r.status = message.data.status;
              r.stop = message.data.stop;

              if (message.data.statusDetails) {
                r.statusDetails = message.data.statusDetails;
              }
            });
            this.allureRuntime.writeFixture();
            return;
          }

          if (message.type === "cypress_command_start") {
            this.allureRuntime.startStep({
              name: message.data.name,
              parameters: message.data.args.map((arg, j) => ({
                name: `Argument "${j}"`,
                value: arg,
              })),
            });
            return;
          }

          if (message.type === "cypress_command_end") {
            this.allureRuntime.updateStep((r) => {
              r.stage = message.data.stage;
              r.status = message.data.status;

              if (message.data.statusDetails) {
                r.statusDetails = message.data.statusDetails;
              }
            });
            this.allureRuntime.stopStep();
            return;
          }

          if (message.type === "cypress_start") {
            currentTestStartMessage = message;

            const suiteLabels = getSuiteLabels(message.data.specPath.slice(0, -1));
            const testTitle = message.data.specPath[message.data.specPath.length - 1];
            const titleMetadata = extractMetadataFromString(testTitle);

            currentTestUuid = this.allureRuntime.startTest({
              name: titleMetadata.cleanTitle || testTitle,
              start: message.data.start,
              fullName: `${message.data.filename}#${message.data.specPath.join(" ")}`,
              stage: Stage.RUNNING,
            });

            this.allureRuntime.updateTest((result) => {
              result.labels.push({
                name: LabelName.LANGUAGE,
                value: "javascript",
              });
              result.labels.push({
                name: LabelName.FRAMEWORK,
                value: "cypress",
              });
              result.labels.push(...suiteLabels);
              result.labels.push(...titleMetadata.labels);
            });
            return;
          }

          if (message.type === "cypress_end") {
            this.allureRuntime.updateTest((result) => {
              result.stage = message.data.stage;
              result.status = message.data.status;

              if (!message.data.statusDetails) {
                return;
              }

              result.statusDetails = message.data.statusDetails;
            }, currentTestUuid!);

            this.allureRuntime.stopTest({ uuid: currentTestUuid!, stop: Date.now() });

            if (currentTestStartMessage!.data.isInteractive) {
              this.allureRuntime.writeTest(currentTestUuid!);
            } else {
              // False positive by eslint (testUuid is string)
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              this.pushTestUuid(currentTestStartMessage!.data.absolutePath, currentTestUuid!);
            }
            return;
          }

          // we can get error when we try to attach screenshot to a failed test because there is no test due to error in hook
          if (!this.allureRuntime.getCurrentExecutingItem()) {
            return;
          }

          this.allureRuntime.applyRuntimeMessages([message], {
            testUuid: currentTestUuid!,
          });
        });

        return null;
      },
    });
  }

  endRun(result: CypressCommandLine.CypressRunResult) {
    result.runs.forEach((run) => {
      this.endSpec(run.spec, run.video || undefined);
    });
  }

  endSpec(spec: Cypress.Spec, cypressVideoPath?: string) {
    const testUuids = this.testsUuidsByCypressAbsolutePath.get(spec.absolute);

    this.testsUuidsByCypressAbsolutePath.delete(spec.absolute);

    if (!testUuids) {
      return;
    }

    if (cypressVideoPath) {
      this.allureRuntime.startFixture("after", {
        name: "Cypress video",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      this.allureRuntime.writeAttachmentFromPath("Cypress video", cypressVideoPath, {
        contentType: ContentType.MP4,
      });
      this.allureRuntime.writeFixture();
    }

    if (this.globalHooksMessages.length) {
      this.globalHooksMessages.forEach((message) => {
        if (message.type === "cypress_hook_start") {
          this.allureRuntime.startFixture(message.data.type, {
            name: message.data.name,
            start: message.data.start,
          });
          return;
        }

        if (message.type === "cypress_hook_end") {
          this.allureRuntime.updateFixture((r) => {
            r.stage = message.data.stage;
            r.status = message.data.status;
            r.stop = message.data.stop;

            if (message.data.statusDetails) {
              r.statusDetails = message.data.statusDetails;
            }
          });
          this.allureRuntime.writeFixture();
        }
      });
    }

    for (const uuid of testUuids) {
      this.allureRuntime.writeTest(uuid);
    }

    this.allureRuntime.writeScope();
  }
}

export const allureCypress = (on: Cypress.PluginEvents, allureConfig?: AllureCypressConfig) => {
  const allureCypressReporter = new AllureCypress(allureConfig);

  allureCypressReporter.attachToCypress(on);

  on("after:run", (results) => {
    allureCypressReporter.endRun(results as CypressCommandLine.CypressRunResult);
  });

  return allureCypressReporter;
};

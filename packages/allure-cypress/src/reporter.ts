import type Cypress from "cypress";
import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { FileSystemWriter, ReporterRuntime, getSuiteLabels } from "allure-js-commons/sdk/reporter";
import type { Config } from "allure-js-commons/sdk/reporter";
import type {
  CypressHookEndMessage,
  CypressHookStartMessage,
  CypressMessage,
  RunContextByAbsolutePath,
} from "./model.js";
import { last, toReversed } from "./utils.js";

export class AllureCypress {
  allureRuntime: ReporterRuntime;

  messagesByAbsolutePath = new Map<string, CypressMessage[]>();
  runContextByAbsolutePath = new Map<string, RunContextByAbsolutePath>();

  globalHooksMessages: CypressMessage[] = [];

  constructor(config?: Config) {
    const { resultsDir = "./allure-results", ...rest } = config || {};

    this.allureRuntime = new ReporterRuntime({
      writer: new FileSystemWriter({
        resultsDir,
      }),
      ...rest,
    });
  }

  createEmptyRunContext(absolutePath: string) {
    this.runContextByAbsolutePath.set(absolutePath, {
      executables: [],
      steps: [],
      scopes: [],
      globalHooksMessages: [],
    });
  }

  attachToCypress(on: Cypress.PluginEvents) {
    on("task", {
      allureReportTest: ({ messages, absolutePath }: { messages: CypressMessage[]; absolutePath: string }) => {
        this.messagesByAbsolutePath.set(absolutePath, messages);

        return null;
      },
      allureReportSpec: (spec: { absolute: string }) => {
        this.createEmptyRunContext(spec.absolute);
        this.endSpec(spec as Cypress.Spec);

        return null;
      },
    });
  }

  endRun(result: CypressCommandLine.CypressRunResult) {
    result.runs.forEach((run) => {
      this.createEmptyRunContext(run.spec.absolute);
      this.endSpec(run.spec, run.video || undefined);
    });
  }

  endSpec(spec: Cypress.Spec, cypressVideoPath?: string) {
    const specMessages = this.messagesByAbsolutePath.get(spec.absolute)!;
    const runContext = this.runContextByAbsolutePath.get(spec.absolute)!;

    specMessages.forEach((message, i) => {
      // we add cypressTestId to messages where it's possible because the field is very useful to glue data
      // @ts-ignore
      // const {cypressTestId} = message.data
      const previousMessagesSlice = specMessages.slice(0, i);
      const lastHookMessage = toReversed(previousMessagesSlice).find(
        ({ type }) => type === "cypress_hook_start" || type === "cypress_hook_end",
      ) as CypressHookStartMessage | CypressHookEndMessage;

      if (message.type === "cypress_suite_start") {
        const scopeUuid = this.allureRuntime.startScope();

        runContext.scopes.push(scopeUuid);
        return;
      }

      if (message.type === "cypress_suite_end") {
        const scopeUuid = runContext.scopes.pop()!;

        this.allureRuntime.writeScope(scopeUuid);
        return;
      }

      if (message.type === "cypress_hook_start" && message.data.global) {
        runContext.globalHooksMessages.push(message);
        return;
      }

      if (message.type === "cypress_hook_start") {
        const fixtureUuid = this.allureRuntime.startFixture(last(runContext.scopes)!, message.data.type, {
          name: message.data.name,
          start: message.data.start,
        })!;

        runContext.executables.push(fixtureUuid);
        return;
      }

      if (
        message.type === "cypress_hook_end" &&
        (lastHookMessage as CypressHookEndMessage)?.data?.global &&
        lastHookMessage?.type === "cypress_hook_start"
      ) {
        runContext.globalHooksMessages.push(message);
        return;
      }

      if (message.type === "cypress_hook_end") {
        const fixtureUuid = runContext.executables.pop()!;

        this.allureRuntime.updateFixture(fixtureUuid, (r) => {
          r.stage = Stage.FINISHED;
          r.status = message.data.status;
          r.stop = message.data.stop;

          if (message.data.statusDetails) {
            r.statusDetails = message.data.statusDetails;
          }
        });
        this.allureRuntime.stopFixture(fixtureUuid);
        return;
      }

      if (message.type === "cypress_test_start") {
        const suiteLabels = getSuiteLabels(message.data.specPath.slice(0, -1));
        const testTitle = message.data.specPath[message.data.specPath.length - 1];
        const titleMetadata = extractMetadataFromString(testTitle);
        const testUuid = this.allureRuntime.startTest(
          {
            name: titleMetadata.cleanTitle || testTitle,
            start: message.data.start,
            fullName: `${message.data.filename}#${message.data.specPath.join(" ")}`,
            stage: Stage.RUNNING,
            labels: [
              {
                name: LabelName.LANGUAGE,
                value: "javascript",
              },
              {
                name: LabelName.FRAMEWORK,
                value: "cypress",
              },
              ...suiteLabels,
              ...titleMetadata.labels,
            ],
          },
          runContext.scopes,
        );

        runContext.executables.push(testUuid);
        return;
      }

      if (message.type === "cypress_test_end") {
        const testUuid = runContext.executables.pop()!;

        this.allureRuntime.updateTest(testUuid, (result) => {
          result.stage = Stage.FINISHED;
          result.status = message.data.status;

          if (!message.data.statusDetails) {
            return;
          }

          result.statusDetails = message.data.statusDetails;
        });

        this.allureRuntime.stopTest(testUuid);
        this.allureRuntime.writeTest(testUuid);
        return;
      }

      // we can get error when we try to attach screenshot to a failed test because there is no test due to error in hook
      if (runContext.executables.length === 0) {
        return;
      }

      if (message.type === "cypress_command_start") {
        const lastExecutableUuid = last(runContext.executables)!;
        const lastStepUuid = last(runContext.steps);
        const stepUuid = this.allureRuntime.startStep(lastExecutableUuid, lastStepUuid, {
          name: message.data.name,
          parameters: message.data.args.map((arg, j) => ({
            name: `Argument [${j}]`,
            value: arg,
          })),
        })!;

        runContext.steps.push(stepUuid);
        return;
      }

      if (message.type === "cypress_command_end") {
        const stepUuid = runContext.steps.pop()!;

        this.allureRuntime.updateStep(stepUuid, (r) => {
          r.status = message.data.status;

          if (message.data.statusDetails) {
            r.statusDetails = message.data.statusDetails;
          }
        });
        this.allureRuntime.stopStep(stepUuid);
        return;
      }

      this.allureRuntime.applyRuntimeMessages(last(runContext.executables)!, [message] as RuntimeMessage[]);
    });

    if (cypressVideoPath) {
      const fixtureUuid = this.allureRuntime.startFixture(runContext.scopes[0], "after", {
        name: "Cypress video",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      })!;
      this.allureRuntime.writeAttachment(fixtureUuid, undefined, "Cypress video", cypressVideoPath, {
        contentType: ContentType.MP4,
      });
      this.allureRuntime.stopFixture(fixtureUuid);
    }

    if (runContext.globalHooksMessages.length > 0) {
      runContext.globalHooksMessages.forEach((message) => {
        if (message.type === "cypress_hook_start") {
          const fixtureUuid = this.allureRuntime.startFixture(runContext.scopes[0], message.data.type, {
            name: message.data.name,
            start: message.data.start,
          })!;

          runContext.executables.push(fixtureUuid);
          return;
        }

        if (message.type === "cypress_hook_end") {
          const fixtureUuid = runContext.executables.pop()!;

          this.allureRuntime.updateFixture(fixtureUuid, (r) => {
            r.status = message.data.status;
            r.stop = message.data.stop;

            if (message.data.statusDetails) {
              r.statusDetails = message.data.statusDetails;
            }
          });
          this.allureRuntime.stopFixture(fixtureUuid);
        }
      });
    }

    this.allureRuntime.writeScope(runContext.scopes.pop()!);
  }
}

export const allureCypress = (on: Cypress.PluginEvents, allureConfig?: Config) => {
  const allureCypressReporter = new AllureCypress(allureConfig);

  allureCypressReporter.attachToCypress(on);

  on("after:run", (results) => {
    allureCypressReporter.endRun(results as CypressCommandLine.CypressRunResult);
  });

  return allureCypressReporter;
};

import type Cypress from "cypress";
import { ContentType, LabelName, Stage } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { FileSystemWriter, ReporterRuntime, getSuiteLabels } from "allure-js-commons/sdk/reporter";
import type { LinkConfig } from "allure-js-commons/sdk/reporter";
import type { CypressRuntimeMessage, CypressTestStartRuntimeMessage } from "./model.js";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: LinkConfig;
};

export class AllureCypress {
  allureRuntime: ReporterRuntime;

  testsUuidsByCypressAbsolutePath = new Map<string, string[]>();

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

    this.testsUuidsByCypressAbsolutePath.set(absolutePath, [...currentUuids, uuid]);
  }

  attachToCypress(on: Cypress.PluginEvents) {
    on("task", {
      allureReportTest: (messages: CypressRuntimeMessage[]) => {
        // TODO:
        let currentTestUuid: string
        let currentTestStartMessage: CypressTestStartRuntimeMessage

        console.log(messages)

        messages.forEach((message) => {
          if (message.type === "cypress_suite_start") {
            this.allureRuntime.startScope()
            return;
          }

          if (message.type === "cypress_suite_end") {
            message.data.hooks.forEach((hook) => {
              this.allureRuntime.startFixture(hook.type, {
                name: hook.name,
                status: hook.status,
                statusDetails: hook.statusDetails,
              })
              this.allureRuntime.writeFixture()
            })
            this.allureRuntime.stopScope()
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
            return
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

            if (currentTestStartMessage!.data.isInteractive!) {
              this.allureRuntime.writeTest(currentTestUuid!);
            } else {
              // False positive by eslint (testUuid is string)
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              this.pushTestUuid(currentTestStartMessage!.data.absolutePath, currentTestUuid!);
            }
            return;
          }

          this.allureRuntime.applyRuntimeMessages([message], {
            testUuid: currentTestUuid!,
          });
        })

        return null;
      },
    });
  }

  endSpec(spec: Cypress.Spec, cypressResult: CypressCommandLine.RunResult) {
    const testUuids = this.testsUuidsByCypressAbsolutePath.get(spec.absolute);
    this.testsUuidsByCypressAbsolutePath.delete(spec.absolute);

    if (!testUuids) {
      return;
    }

    for (const uuid of testUuids) {
      // TODO add it to spec scope to remove duplicates.
      if (cypressResult.video) {
        this.allureRuntime.writeAttachmentFromPath(
          "Video",
          cypressResult.video,
          {
            contentType: ContentType.MP4,
          },
          uuid,
        );
      }

      this.allureRuntime.writeTest(uuid);
    }
  }
}

export const allureCypress = (on: Cypress.PluginEvents, allureConfig?: AllureCypressConfig) => {
  const allureCypressReporter = new AllureCypress(allureConfig);

  allureCypressReporter.attachToCypress(on);

  on("after:spec", (spec, result) => {
    allureCypressReporter.endSpec(spec, result);
  });

  return allureCypressReporter;
};

import type Cypress from "cypress";
import { readFileSync } from "node:fs";
import { ContentType, LabelName, Stage } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { FileSystemWriter, ReporterRuntime, getSuitesLabels } from "allure-js-commons/sdk/reporter";
import type { CypressRuntimeMessage, CypressTestEndRuntimeMessage, CypressTestStartRuntimeMessage } from "./model.js";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
};

export class AllureCypress {
  runtime: ReporterRuntime;

  testsUuidsByCypressAbsolutePath = new Map<string, string[]>();

  constructor(config?: AllureCypressConfig) {
    const { resultsDir = "./allure-results", ...rest } = config || {};

    this.runtime = new ReporterRuntime({
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
        const startMessage = messages[0] as CypressTestStartRuntimeMessage;
        const endMessage = messages[messages.length - 1] as CypressTestEndRuntimeMessage;

        if (startMessage.type !== "cypress_start" || endMessage.type !== "cypress_end") {
          throw new Error("INTERNAL ERROR: Invalid message sequence");
        }

        const suiteLabels = getSuitesLabels(startMessage.data.specPath.slice(0, -1));
        const testTitle = startMessage.data.specPath[startMessage.data.specPath.length - 1];
        const titleMetadata = extractMetadataFromString(testTitle);
        const testUuid = this.runtime.startTest({
          name: titleMetadata.cleanTitle || testTitle,
          start: startMessage.data.start,
          fullName: `${startMessage.data.filename}#${startMessage.data.specPath.join(" ")}`,
          stage: Stage.RUNNING,
        });

        this.runtime.updateTest((result) => {
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

          this.runtime.applyRuntimeMessages(messages.slice(1, messages.length - 1), {
            testUuid,
            customHandler: (message) => {
              const type = message.type;

              if (type === "cypress_screenshot") {
                const { name, path } = message.data;
                // False positive by eslint (path is string)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const screenshotBody = readFileSync(path);

                this.runtime.writeAttachment(
                  {
                    name,
                    content: screenshotBody,
                    contentType: ContentType.PNG,
                  },
                  testUuid,
                );
              }
            },
          });
        }, testUuid);
        this.runtime.updateTest((result) => {
          result.stage = endMessage.data.stage;
          result.status = endMessage.data.status;

          if (!endMessage.data.statusDetails) {
            return;
          }

          result.statusDetails = endMessage.data.statusDetails;
        }, testUuid);

        this.runtime.stopTest({ uuid: testUuid, stop: Date.now() });

        if (startMessage.data.isInteractive) {
          this.runtime.writeTest(testUuid);
        } else {
          // False positive by eslint (testUuid is string)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this.pushTestUuid(startMessage.data.absolutePath, testUuid);
        }

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

    let videoSource: string | undefined;

    for (const uuid of testUuids) {
      if (!cypressResult.video) {
        this.runtime.writeTest(uuid);
        continue;
      }

      if (!videoSource) {
        videoSource = this.runtime.writeAttachmentFromPath(
          "Video",
          cypressResult.video,
          {
            contentType: ContentType.MP4,
          },
          uuid,
        );
      } else {
        this.runtime.updateTest((result) => {
          result.attachments.push({
            name: "Video",
            source: videoSource!,
            type: ContentType.MP4,
          });
        }, uuid);
      }

      this.runtime.writeTest(uuid);
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

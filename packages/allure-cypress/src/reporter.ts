import Cypress from "cypress";
import { readFileSync } from "node:fs";
import {
  AllureNodeReporterRuntime,
  ContentType,
  FileSystemAllureWriter,
  LabelName,
  RuntimeMessage,
  Stage,
  extractMetadataFromString,
  getSuitesLabels,
} from "allure-js-commons/new/sdk/node";
import { CypressRuntimeMessage, CypressTestEndRuntimeMessage, CypressTestStartRuntimeMessage } from "./model.js";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
};

export class AllureCypress {
  runtime: AllureNodeReporterRuntime;

  testsUuidsByCypressAbsolutePath = new Map<string, string[]>();

  constructor(private config?: AllureCypressConfig) {
    const { resultsDir = "./allure-results", ...rest } = config || {};

    this.runtime = new AllureNodeReporterRuntime({
      writer: new FileSystemAllureWriter({
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
      allureReportTest: async (messages: CypressRuntimeMessage[]) => {
        const startMessage = messages[0] as CypressTestStartRuntimeMessage;
        const endMessage = messages[messages.length - 1] as CypressTestEndRuntimeMessage;

        if (startMessage.type !== "cypress_start" || endMessage.type !== "cypress_end") {
          // TODO:
          throw new Error("ksdfjlskdjflksdfj");
        }

        const suiteLabels = getSuitesLabels(startMessage.data.specPath.slice(0, -1));
        const testTitle = startMessage.data.specPath[startMessage.data.specPath.length - 1];
        const titleMetadata = extractMetadataFromString(testTitle);
        const testUuid = await this.runtime.start({
          name: titleMetadata.cleanTitle || testTitle,
          start: startMessage.data.start,
          fullName: `${startMessage.data.filename}#${startMessage.data.specPath.join(" ")}`,
          stage: Stage.RUNNING,
        });

        await this.runtime.update(testUuid, async (result) => {
          result.labels!.push({
            name: LabelName.LANGUAGE,
            value: "javascript",
          });
          result.labels!.push({
            name: LabelName.FRAMEWORK,
            value: "cypress",
          });
          result.labels!.push(...suiteLabels);
          result.labels!.push(...titleMetadata.labels);

          await this.runtime.applyRuntimeMessages(
            testUuid,
            messages.slice(1, messages.length - 1) as RuntimeMessage[],
            (message) => {
              const { type, data } = message as CypressRuntimeMessage;

              if (type === "cypress_screenshot") {
                const attachmentName = data.name;
                const screenshotBody = readFileSync(data.path);

                this.runtime.writeAttachment(testUuid, {
                  name: attachmentName,
                  content: screenshotBody,
                  contentType: ContentType.PNG,
                });
              }
            },
          );
        });
        await this.runtime.update(testUuid, (result) => {
          result.stage = endMessage.data.stage;
          result.status = endMessage.data.status;
          result.statusDetails = endMessage.data.statusDetails;
        });

        await this.runtime.stop(testUuid, Date.now());

        if (startMessage.data.isInteractive) {
          this.runtime.write(testUuid);
        } else {
          this.pushTestUuid(startMessage.data.absolutePath, testUuid);
        }

        return null;
      },
    });
  }

  async endSpec(spec: Cypress.Spec, cypressResult: CypressCommandLine.RunResult) {
    const testUuids = this.testsUuidsByCypressAbsolutePath.get(spec.absolute);
    this.testsUuidsByCypressAbsolutePath.delete(spec.absolute);

    if (!testUuids) {
      return;
    }

    const videoSourcePath = cypressResult.video
      ? this.runtime.writeAttachmentFromPath(cypressResult.video, { contentType: ContentType.MP4 })
      : undefined;

    for (const uuid of testUuids) {
      if (!videoSourcePath) {
        this.runtime.write(uuid);
        continue;
      }

      await this.runtime.update(uuid, (result) => {
        result.attachments!.push({
          source: videoSourcePath,
          name: "Video",
          type: ContentType.MP4,
        });
      });

      this.runtime.write(uuid);
    }
  }
}

export const allureCypress = (on: Cypress.PluginEvents, allureConfig?: AllureCypressConfig) => {
  const allureCypressReporter = new AllureCypress(allureConfig);

  allureCypressReporter.attachToCypress(on);

  on("after:spec", async (spec, result) => {
    await allureCypressReporter.endSpec(spec, result);
  });

  return allureCypressReporter;
};

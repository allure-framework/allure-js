import Cypress from "cypress";
import { readFileSync } from "node:fs";
import {
  AllureNodeReporterRuntime,
  Config,
  FileSystemAllureWriter,
  ContentType,
  LabelName,
  RuntimeMessage,
  Link,
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

// export const allureCypress = (on: Cypress.PluginEvents, config: Omit<Config, "writer">) => {
//   const { resultsDir = "./allure-results", ...rest } = config;
//   const runtime = new AllureNodeReporterRuntime({
//     writer: new FileSystemAllureWriter({ resultsDir }),
//     ...rest,
//   });
//
//   on("task", {
//     allureReportTest: async (messages: CypressRuntimeMessage[]) => {
//       const startMessage = messages[0] as CypressTestStartRuntimeMessage;
//       const endMessage = messages[messages.length - 1] as CypressTestEndRuntimeMessage;
//
//       if (startMessage.type !== "cypress_start" || endMessage.type !== "cypress_end") {
//         // TODO:
//         throw new Error("ksdfjlskdjflksdfj");
//       }
//
//       const suiteLabels = getSuitesLabels(startMessage.data.specPath.slice(0, -1));
//       const testTitle = startMessage.data.specPath[startMessage.data.specPath.length - 1];
//       const titleMetadata = extractMetadataFromString(testTitle);
//       const testUuid = await runtime.start({
//         name: titleMetadata.cleanTitle || testTitle,
//         start: startMessage.data.start,
//         fullName: `${startMessage.data.filename}#${startMessage.data.specPath.join(" ")}`,
//         stage: Stage.RUNNING,
//       });
//
//       await runtime.update(testUuid, async (result) => {
//         result.labels!.push({
//           name: LabelName.LANGUAGE,
//           value: "javascript",
//         });
//         result.labels!.push({
//           name: LabelName.FRAMEWORK,
//           value: "cypress",
//         });
//         result.labels!.push(...suiteLabels);
//         result.labels!.push(...titleMetadata.labels);
//
//         console.log("metadata messages", messages.slice(1, messages.length - 1));
//
//         await runtime.applyRuntimeMessages(
//           testUuid,
//           messages.slice(1, messages.length - 1) as RuntimeMessage[],
//           (message) => {
//             const { type, data } = message as CypressRuntimeMessage;
//
//             if (type === "cypress_screenshot") {
//               const attachmentName = data.name;
//               const screenshotBody = readFileSync(data.path);
//
//               runtime.writeAttachment(testUuid, {
//                 name: attachmentName,
//                 content: screenshotBody,
//                 contentType: ContentType.PNG,
//               });
//             }
//           },
//         );
//       });
//       await runtime.update(testUuid, async (result) => {
//         result.stage = endMessage.data.stage;
//         result.status = endMessage.data.status;
//         result.statusDetails = endMessage.data.statusDetails;
//       });
//       await runtime.stop(testUuid, endMessage.data.stop);
//       await runtime.write(testUuid);
//
//       return null;
//     },
//   });
// };

export class AllureCypress {
  runtime: AllureNodeRuntime;
  currentTestsByAbsolutePath = new Map<string, [AllureTest, number][]>();
  // need to keep the variable here because we recieve end-message and finish the current test separately
  currentSteps: AllureStep[] = [];

  constructor(private config?: AllureCypressConfig) {
    this.runtime = new AllureNodeRuntime({
      writer: new FileSystemAllureWriter({
        resultsDir: config?.resultsDir || "./allure-results",
      }),
    });
  }

  private startAllureTest(message: TestStartMessage) {
    const suiteLabels = getSuitesLabels(message.specPath.slice(0, -1));
    const testTitle = message.specPath[message.specPath.length - 1];
    const titleMetadata = extractMetadataFromString(testTitle);
    const currentTest = new AllureTest(this.runtime, message.start);

    currentTest.name = titleMetadata.cleanTitle;
    currentTest.fullName = `${message.filename}#${message.specPath.join(" ")}`;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "cypress");

    suiteLabels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    titleMetadata.labels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    return currentTest;
  }

  endSpec(spec: Cypress.Spec, results: CypressCommandLine.RunResult) {
    const currentTests = this.currentTestsByAbsolutePath.get(spec.absolute);

    if (!currentTests?.length) {
      return;
    }

    const videoName = results.video ? this.runtime.writeAttachmentFromPath(results.video, ContentType.MP4) : undefined;

    currentTests.forEach(([test, stop]) => {
      if (videoName) {
        test.addAttachment("Video", ContentType.MP4, videoName);
      }

      test.endTest(stop);
    });

    this.currentTestsByAbsolutePath.delete(spec.absolute);
  }

  attachToCypress(on: Cypress.PluginEvents) {
    on("task", {
      allureReportTest: ({
                           isInteractive,
                           testFileAbsolutePath,
                           startMessage,
                           endMessage,
                           messages,
                         }: ReportFinalMessage) => {
        const currentTests = this.currentTestsByAbsolutePath.get(testFileAbsolutePath) || [];
        const currentTest = this.startAllureTest(startMessage);

        messages.forEach(({ type, payload }) => {
          if (!currentTest) {
            return;
          }

          if (type === MessageType.STEP_STARTED) {
            const currentStep = this.currentSteps[this.currentSteps.length - 1];
            const newStep = (currentStep || currentTest).startStep(payload.name, payload.start);

            this.currentSteps.push(newStep);
            return;
          }

          if (type === MessageType.STEP_ENDED) {
            const currentStep = this.currentSteps.pop()!;

            currentStep.status = payload.status;
            currentStep.statusDetails = payload.statusDetails!;
            currentStep.stage = payload.stage!;
            currentStep.endStep(payload.stop);
            return;
          }

          if (type === MessageType.SCREENSHOT) {
            const currentStep = this.currentSteps[this.currentSteps.length - 1];
            const attachmentName = payload.name;
            const screenshotBody = readFileSync(payload.path);
            const screenshotName = this.runtime.writeAttachment(screenshotBody, ContentType.PNG);

            (currentStep || currentTest).addAttachment(attachmentName, ContentType.PNG, screenshotName);
            return;
          }

          if (type === MessageType.METADATA) {
            const { parameter = [], links = [], attachments, ...metadata } = payload;
            const currentStep = this.currentSteps[this.currentSteps.length - 1];

            parameter.forEach(({ name, value, excluded, mode }) => {
              currentTest.parameter(name, value, {
                excluded,
                mode,
              });
            });
            attachments?.forEach((attachment) => {
              const attachmentName = this.runtime.writeAttachment(
                attachment.content,
                attachment.type,
                attachment.encoding,
              );

              (currentStep || currentTest).addAttachment(attachment.name, attachment.type, attachmentName);
            });

            if (!this.config?.links?.length) {
              currentTest.applyMetadata({
                ...metadata,
                links,
              });
              return;
            }

            const formattedLinks: Link[] = links.map((link) => {
              const matcher = this.config?.links?.find?.((item) => item.type === link.type);

              if (!matcher || link.url.startsWith("http")) {
                return link;
              }

              const url = matcher.urlTemplate.replace("%s", link.url);
              const name = link.name || link.url;

              return {
                ...link,
                name,
                url,
              };
            });

            currentTest.applyMetadata({
              ...metadata,
              links: formattedLinks,
            });
            return;
          }
        });

        currentTest.stage = endMessage.stage;
        currentTest.status = endMessage.status;
        currentTest.statusDetails = endMessage.statusDetails!;
        currentTest.calculateHistoryId();
        this.currentTestsByAbsolutePath.set(
          testFileAbsolutePath,
          currentTests.concat([[currentTest, endMessage.stop]]),
        );

        if (isInteractive) {
          this.endSpec({ absolute: testFileAbsolutePath } as Cypress.Spec, {} as CypressCommandLine.RunResult);
        }

        return null;
      },
    });
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

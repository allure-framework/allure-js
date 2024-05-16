import { run } from "newman";
import type { CollectionDefinition } from "postman-collection";
import type { AllureResults, TestResult, TestResultContainer } from "allure-js-commons";

export type TestResultsByFullName = Record<string, TestResult>;

export const runNewmanCollection = async (collection: CollectionDefinition): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };

  return new Promise((resolve) => {
    const newmanEmitter = run(
      {
        collection,
        reporters: ["allure"],
        reporter: {
          allure: {
            testMode: true,
          },
        },
      },
      () => {
        return resolve(res);
      },
    );

    newmanEmitter.on("allureWriterMessage", (message: string) => {
      const event: { path: string; type: string; data: string } = JSON.parse(message);
      const data = event.type !== "attachment" ? JSON.parse(Buffer.from(event.data, "base64").toString()) : event.data;

      switch (event.type) {
        case "container":
          res.groups.push(data as TestResultContainer);
          break;
        case "result":
          res.tests.push(data as TestResult);
          break;
        case "attachment":
          res.attachments[event.path] = event.data;
          break;
        default:
          break;
      }
    });
  });
};

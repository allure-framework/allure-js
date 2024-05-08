import { run } from "newman";
import type { CollectionDefinition } from "postman-collection";
import { InMemoryAllureWriter, TestResult } from "allure-js-commons";

export const runNewman = async (collection: CollectionDefinition): Promise<TestResult[]> => {
  return new Promise((resolve) => {
    run({
      collection,
      reporters: ["allure"],
      reporter: {
        allure: {
          testMode: true,
          postProcessorForTest: (res: InMemoryAllureWriter) => {
            resolve(res.tests);
          },
        },
      },
    });
  });
};

import { InMemoryAllureWriter, TestResult } from "allure-js-commons";
import { run } from "newman";
import type { CollectionDefinition } from "postman-collection";

export const runNewman = async (collection: CollectionDefinition): Promise<TestResult[]> => {
  return new Promise((resolve) => {
    run({
      collection,
      reporters: ["allure"],
      reporter: {
        allure: {
          postProcessorForTest: (res: InMemoryAllureWriter) => {
            resolve(res.tests);
          },
        },
      },
    });
  });
};

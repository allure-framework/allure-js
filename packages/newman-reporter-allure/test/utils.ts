import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";
import { type NewmanRunOptions, run } from "newman";
import type { CollectionDefinition } from "postman-collection";

export const runNewmanCollection = async (
  collection: CollectionDefinition,
  options: Pick<NewmanRunOptions, "iterationData" | "iterationCount"> = {},
): Promise<AllureResults> => {
  const reader = new MessageReader();

  const allureResults: AllureResults = await new Promise((resolve, reject) => {
    const newmanEmitter = run(
      {
        collection,
        ...options,
        reporters: ["allure"],
        reporter: {
          allure: {},
        },
      },
      (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(reader.results);
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    newmanEmitter.on("allureWriterMessage", reader.handleMessage);
  });

  await reader.attachResults();
  return allureResults;
};

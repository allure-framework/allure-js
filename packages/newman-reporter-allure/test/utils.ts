import { run } from "newman";
import type { CollectionDefinition } from "postman-collection";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runNewmanCollection = async (collection: CollectionDefinition): Promise<AllureResults> => {
  const reader = new MessageReader();

  const allureResults: AllureResults = await new Promise((resolve) => {
    const newmanEmitter = run(
      {
        collection,
        reporters: ["allure"],
        reporter: {
          allure: {},
        },
      },
      () => {
        return resolve(reader.results);
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    newmanEmitter.on("allureWriterMessage", reader.handleMessage);
  });

  await reader.attachResults();
  return allureResults;
};

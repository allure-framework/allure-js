import { run } from "newman";
import type { CollectionDefinition } from "postman-collection";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runNewmanCollection = async (collection: CollectionDefinition): Promise<AllureResults> => {
  const reader = new MessageReader();

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
        return resolve(reader.results);
      },
    );

    newmanEmitter.on("allureWriterMessage", reader.handleMessage);
  });
};

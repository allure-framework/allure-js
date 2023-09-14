import Hermione from "hermione";
import { AllureResults, InMemoryAllureWriter } from "allure-js-commons";

export const runHermione = async (testPaths: string[]): Promise<AllureResults> => {
  const hermione = new Hermione("./test/.hermione.conf.js");
  const allure = require("allure-hermione");
  const writer = new InMemoryAllureWriter();
  allure(hermione, {
    writer,
  });

  await hermione.run(testPaths, { reporters: [] });
  return writer;
};

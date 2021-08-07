import * as path from "path";
import { Given } from "cucumber";
import { outputFile } from "fs-extra";

export const makeFormatterFile: (
  formatterPath: string,
  formatterOutPath: string,
  config?: string,
) => Promise<void> = (formatterPath, formatterOutPath, config = "{}") => {
  const formatter = `
  import { CucumberJSAllureFormatter } from "../../../../src/CucumberJSAllureReporter";
  import {AllureRuntime} from "allure-js-commons";

  export default class Reporter extends CucumberJSAllureFormatter {
    constructor(options: any) {
      super(
        options,
        new AllureRuntime({ resultsDir: "${formatterOutPath}" }), ${config}
      );
    }
  }`;
  return outputFile(formatterPath, formatter);
};

Given(/^a feature file "(.*)":$/, function (fileName, fileContent) {
  const absoluteFilePath = path.join(this.tmpDir, "features", fileName);
  return outputFile(absoluteFilePath, fileContent);
});

Given(/^a feature:$/, function (fileContent) {
  const fileName = "example.feature";
  const absoluteFilePath = path.join(this.tmpDir, "features", fileName);
  return outputFile(absoluteFilePath, fileContent);
});

Given(/^a allure formatter file$/, function () {
  const formatterPath = path.join(this.tmpDir, this.formatterPath);
  const formatterOutPath = path.join(this.tmpDir, this.formatterOutPath);
  return makeFormatterFile(formatterPath, formatterOutPath);
});

Given(/^a allure formatter file with config:$/, function (config) {
  const formatterPath = path.join(this.tmpDir, this.formatterPath);
  const formatterOutPath = path.join(this.tmpDir, this.formatterOutPath);
  return makeFormatterFile(formatterPath, formatterOutPath, config);
});

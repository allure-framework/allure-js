import jetpack = require("fs-jetpack");
import * as Mocha from "mocha";
import * as path from "path";
import * as propertiesReader from "properties-reader";
import { MochaAllureReporter } from "../../src/MochaAllureReporter";

const testDir = "./dist/test/fixtures/specs";
const resultsDir = path.join(__dirname, "../../../out/allure-results");
const resultsPollingInterval: number = 10;

let results: any[] = [];

export function runTests(...specs: string[]) {
  const mocha = new Mocha();
  assignSpecs(mocha, specs);
  mocha
    .reporter(MochaAllureReporter, { "resultsDir": "./out/allure-results" })
    .run(failures => {
      process.exitCode = failures ? 1 : 0;
    })
    .on("end", () => (results = readResults("*.json")));
}

export function whenResultsAppeared() {
  return new Promise((resolve, reject) => {
    (function waitForResults() {
      if (results.length > 0) {
        return resolve();
      }
      setTimeout(waitForResults, resultsPollingInterval);
    })();
  });
}

export function findTest(name: string): any {
  return results.find(result => result.name === name);
}

export function findStatusDetails(testName: string, key: string): any {
  return findTest(testName).statusDetails[key];
}

export function findLabel(testName: string, labelName: string): any {
  return findTest(testName).labels.find(label => label.name === labelName);
}

export function findParameter(testName: string, parameterName: string): any {
  return findParameters(testName).find(parameter => parameter.name === parameterName);
}

export function findParameters(testName: string): any[] {
  return findTest(testName).parameters;
}

export function findAttachment(testName: string, attachmentName: string): any {
  return findAttachments(testName).find(attachment => attachment.name === attachmentName);
}

export function findAttachments(testName: string): any[] {
  return findTest(testName).attachments;
}

export function findStepAttachments(testName: string, stepName: string): any[] {
  return findStep(testName, stepName).attachments;
}

export function findLinks(testName: string): any[] {
  return findTest(testName).links;
}

export function findSteps(testName: string): any[] {
  return findTest(testName).steps;
}

export function findStep(testName: string, stepName: string): any {
  return findTest(testName).steps.find(step => step.name === stepName);
}

export function cleanResults() {
  results = [];
}

export function readResults(pattern: string): any[] {
  return findFiles(pattern).map(file => require(file));
}

export function findFiles(pattern: string): any[] {
  return jetpack
    .dir(resultsDir)
    .find({ matching: pattern })
    .map(fileName => path.join(resultsDir, fileName));
}

export function readProperties(fileName: string) {
  return propertiesReader(fileName);
}

function assignSpecs(mocha: Mocha, specs: string[]) {
  jetpack
    .dir(testDir)
    .find({ matching: specs.map(spec => `${spec}.js`) })
    .forEach(file => mocha.addFile(path.join(testDir, file)));
}

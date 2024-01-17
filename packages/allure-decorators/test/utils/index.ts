import * as jetpack from "fs-jetpack";
import Mocha from "mocha";
import * as path from "path";
import { InMemoryAllureWriter, TestResult } from "allure-js-commons";
import { MochaAllureReporter } from "allure-mocha/runtime";

const testDir = "./test/fixtures/specs";

export function runTests(...specs: string[]): Promise<InMemoryAllureWriter> {
  const writer = new InMemoryAllureWriter();
  const mocha = new Mocha();
  mocha.reporter(MochaAllureReporter, { writer });
  assignSpecs(mocha, specs);
  return new Promise((resolve) => {
    mocha.run(() => resolve(writer));
  });
}

export function findLabel(test: TestResult, labelName: string): any {
  return test.labels.find((label) => label.name === labelName);
}

export function findParameter(test: TestResult, parameterName: string): any {
  return test.parameters.find((parameter) => parameter.name === parameterName);
}

export function findStep(test: TestResult, stepName: string): any {
  return test.steps.find((step) => step.name === stepName);
}

function assignSpecs(mocha: Mocha, specs: string[]) {
  jetpack
    .dir(testDir)
    .find({ matching: specs.map((spec) => `${spec}.ts`) })
    .forEach((file) => {
      const testPath = path.resolve(testDir, file);
      // remove the test from node_modules cache, so it can be executed again
      delete require.cache[testPath];
      mocha.addFile(testPath);
    });
}

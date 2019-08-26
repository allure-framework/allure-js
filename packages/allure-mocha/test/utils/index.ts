import jetpack = require("fs-jetpack");
import * as path from "path";
import Mocha from "mocha";
import { MochaAllureReporter } from "../../src/MochaAllureReporter";
import { InMemoryAllureWriter, TestResult } from "allure-js-commons";

const testDir = "./dist/test/fixtures/specs";

export function runTests(...specs: string[]): Promise<InMemoryAllureWriter> {
  const writer = new InMemoryAllureWriter();
  const mocha = new Mocha();
  mocha.reporter(MochaAllureReporter, { writer });
  assignSpecs(mocha, specs);
  return new Promise(resolve => {
    mocha.run(() => resolve(writer));
  });
}

export function findLabelValue(test: TestResult, labelName: string) {
  const label = test.labels.find(label => label.name === labelName);
  return label && label.value;
}

export function findParameter(test: TestResult, parameterName: string): any {
  return test.parameters.find(parameter => parameter.name === parameterName);
}

function assignSpecs(mocha: Mocha, specs: string[]) {
  jetpack
    .dir(testDir)
    .find({ matching: specs.map(spec => `${spec}.js`) })
    .forEach(file => {
      const testPath = path.resolve(testDir, file);
      // remove the test from node_modules cache, so it can be executed again
      delete require.cache[testPath];
      mocha.addFile(testPath);
    });
}

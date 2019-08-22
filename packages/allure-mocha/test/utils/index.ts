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

export function findLabel(test: TestResult, labelName: string) {
  return test.labels.find(label => label.name === labelName);
}

export function findParameter(test: TestResult, parameterName: string): any {
  return test.parameters.find(parameter => parameter.name === parameterName);
}

function assignSpecs(mocha: Mocha, specs: string[]) {
  jetpack
    .dir(testDir)
    .find({ matching: specs.map(spec => `${spec}.js`) })
    .forEach(file => mocha.addFile(path.join(testDir, file)));
}

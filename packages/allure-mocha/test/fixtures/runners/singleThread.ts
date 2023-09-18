import { globSync } from "glob";
import Mocha from "mocha";
import MochaAllureReporter from "allure-mocha";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  reporter: MochaAllureReporter,
});

globSync("test/fixtures/specs/runtime.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

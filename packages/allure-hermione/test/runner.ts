import path from "path";
import { TestResult } from "allure-js-commons";
import chai from "chai";
import chaiLike from "chai-like";
import chaiThings from "chai-things";
import * as glob from "glob";
import Mocha from "mocha";
import "source-map-support/register";

chai.should();
chai.use(chaiLike);
chai.use(chaiThings);

export const getTestResultByName = (results: TestResult[], name: string) =>
  results.find((result) => result.name === name)!;

const mocha = new Mocha({
  timeout: 30000,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  reporter: require("mocha-multi-reporters"),
  reporterOptions: {
    reporterEnabled: `list, ${require.resolve("allure-mocha")}`,
    reporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

glob.globSync("./test/spec/**/*.test.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => {
  process.exit(failures === 0 ? 0 : 1);
});

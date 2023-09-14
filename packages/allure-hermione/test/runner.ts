import path from "path";
import { TestResult } from "allure-js-commons";
import glob from "glob";
import Mocha from "mocha";
import selenium from "selenium-standalone";
import "source-map-support/register";

export const getTestResultByName = (results: TestResult[], name: string) =>
  results.find((result) => result.name === name)!;

(async () => {
  await selenium.install();
  const childProcess = await selenium.start();
  const mocha = new Mocha({
    timeout: 30000,
    reporter: require("mocha-multi-reporters"),
    reporterOptions: {
      reporterEnabled: `list, ${(require.resolve("allure-mocha"))}`,
      reporterOptions: {
        resultsDir: path.resolve(__dirname, "../out/allure-results"),
      },
    },
  });

  glob.sync("./test/spec/**/*.test.ts").forEach((file) => mocha.addFile(file));

  mocha.run((failures) => {
    childProcess.kill();
    process.exit(failures === 0 ? 0 : 1);
  });
})();

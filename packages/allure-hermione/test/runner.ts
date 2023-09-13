import path from "path";
import { TestResult } from "allure-js-commons";
import glob from "glob";
import Mocha from "mocha";
import selenium from "selenium-standalone";
import "source-map-support/register";

export const getTestResultByName = (results: TestResult[], name: string) =>
  results.find((result) => result.name === name)!;

(async () => {
  // await selenium.install();

  const chromedriver = require('chromedriver');
  chromedriver.start();

  // const seleniumProcess = await selenium.start();

  const mocha = new Mocha({
    timeout: 30000,
    reporter: require("mocha-multi-reporters"),
    reporterOptions: {
      reporterEnabled: "list, ../allure-mocha",
      allureMochaReporterOptions: {
        resultsDir: path.resolve(__dirname, "../out/allure-results"),
      },
    },
  });

  glob.sync("./test/spec/**/*.test.ts").forEach((file) => mocha.addFile(file));

  mocha.run((failures) => {
    // seleniumProcess.kill();
    chromedriver.stop();
    process.exit(failures === 0 ? 0 : 1);
  });
})();

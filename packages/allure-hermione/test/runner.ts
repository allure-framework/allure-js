// custom runner for mocha that allows to include a custom reporter
// which is not packed into an npm module
import path from "path";
import glob from "glob";
import Hermione from "hermione";
import Mocha from "mocha";
import selenium from "selenium-standalone";
import "source-map-support/register";
import { HermioneAllure } from "./types";

const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

export const runHermioneTests = async (tests: string[]) => {
  hermione.allure.writer.results = [];

  await hermione.run(tests, {});

  return hermione.allure.writer.results;
};

(async () => {
  await selenium.install();

  const seleniumProcess = await selenium.start();
  const mocha = new Mocha({
    timeout: 30000,
    reporter: "mocha-multi-reporters",
    reporterOptions: {
      reporterEnabled: "list, ../allure-mocha",
      allureMochaReporterOptions: {
        resultsDir: path.resolve(__dirname, "../out/allure-results"),
      },
    },
  });

  glob.sync("./test/spec/**/*.test.ts").forEach((file) => mocha.addFile(file));

  mocha.run((failures) => {
    seleniumProcess.kill();
    process.exit(failures === 0 ? 0 : 1);
  });
})();

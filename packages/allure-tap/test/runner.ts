// custom runner for mocha that allows to include a custom reporter
// which is not packed into an npm module
import path from "path";
import fg from "fast-glob";
import Mocha from "mocha";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  reporter: "mocha-multi-reporters",
  reporterOptions: {
    reporterEnabled: "list, ../allure-mocha",
    parallel: true,
    allureMochaReporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

fg.sync("src/**/*.test.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

// custom runner for mocha that allows to include a custom reporter
// which is not packed into an npm module
import path from "path";
import glob from "glob";
import Mocha from "mocha";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  reporter: "mocha-multi-reporters",
  asyncOnly: true,
  reporterOptions: {
    reporterEnabled: "list, ../allure-mocha",
    allureMochaReporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

glob.sync("test/specs/**/*.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

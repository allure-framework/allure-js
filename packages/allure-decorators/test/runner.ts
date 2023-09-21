// custom runner for mocha that allows to include a custom reporter
// which is not packed into an npm module
import path from "path";
import * as glob from "glob";
import Mocha from "mocha";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  reporter: require("mocha-multi-reporters"),
  reporterOptions: {
    reporterEnabled: "list, ../allure-mocha",
    allureMochaReporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

glob.globSync("test/specs/**/*.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

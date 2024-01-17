import * as glob from "glob";
import Mocha from "mocha";
import path from "path";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 30000,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  reporter: require("mocha-multi-reporters"),
  reporterOptions: {
    reporterEnabled: "list, ../allure-mocha",
    allureMochaReporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

glob.globSync("./test/spec/**/*.test.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => {
  process.exit(failures === 0 ? 0 : 1);
});

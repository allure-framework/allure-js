import Mocha from "mocha";
import path from "path";
import glob from "glob";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  reporter: require("mocha-multi-reporters"),
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

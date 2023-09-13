import Mocha from "mocha";
import path from "path";
import { globSync } from "glob";
import "source-map-support/register";
const resolve = require.resolve("allure-mocha");

const mocha = new Mocha({
  timeout: 16000,
  reporter: require("mocha-multi-reporters"),
  reporterOptions: {
    reporterEnabled: `list, ${resolve}`,
    reporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

globSync("test/**/*.test.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

import { globSync } from "glob";
import Mocha from "mocha";
import path from "path";
import "source-map-support/register";

const mocha = new Mocha({
  timeout: 16000,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  reporter: require("mocha-multi-reporters"),
  reporterOptions: {
    reporterEnabled: `list, ${require.resolve("allure-mocha")}`,
    reporterOptions: {
      resultsDir: path.resolve(__dirname, "../out/allure-results"),
    },
  },
});

globSync("test/**/*.test.ts").forEach((file) => mocha.addFile(file));

mocha.run((failures) => process.exit(failures === 0 ? 0 : 1));

// custom runner for mocha that allows to include a custom reporter
// which is not packed into an npm module
import Mocha from "mocha";
import glob from "glob";
import "source-map-support/register";

declare module "mocha" {
  interface InterfaceContributions {
    "mocha-typescript": never;
  }
}

const mocha = new Mocha({
  ui: "mocha-typescript",
  timeout: 16000,
  reporter: "mocha-multi",
  reporterOptions: {
    list: "-",
    [require.resolve("../")]: {
      stdout: "-",
      options: {
        resultsDir: "./out/allure-results"
      }
    }
  }
});

glob.sync("dist/test/specs/**/*.js").forEach(file => mocha.addFile(file));

mocha.run(failures => process.exit(failures === 0 ? 0 : 1));

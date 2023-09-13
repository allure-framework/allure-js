import path from "path";
import chai from "chai";
import chaiLike from "chai-like";
import chaiThings from "chai-things";
import glob from "glob";
import Mocha from "mocha";
import "source-map-support/register";

chai.should();
chai.use(chaiLike);
chai.use(chaiThings);

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

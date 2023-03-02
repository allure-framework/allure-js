/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

const { setHeadlessWhen, setCommonPlugins } = require("@codeceptjs/configure");
const path = require("path");

setCommonPlugins();

module.exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      require: "allure-codeceptjs",
      enabled: true,
      postProcessorForTest: global.postProcessorForTest,
    },
  },
};

const path = require("node:path");
const { setCommonPlugins } = require("@codeceptjs/configure");

setCommonPlugins();

exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      require: require.resolve("allure-codeceptjs"),
      testMode: true,
      enabled: true,
    },
  },
  helpers: {
    CustomHelper: {
      require: "./helper.js",
    },
  },
};

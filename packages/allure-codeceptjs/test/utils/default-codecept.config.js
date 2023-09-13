const { setHeadlessWhen, setCommonPlugins } = require("@codeceptjs/configure");
const path = require("path");

setCommonPlugins();

module.exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      require: require.resolve("allure-codeceptjs"),
      enabled: true,
    },
  },
};

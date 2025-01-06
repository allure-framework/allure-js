const path = require("node:path");
const { setCommonPlugins } = require("@codeceptjs/configure");

setCommonPlugins();

exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      require: require.resolve("allure-codeceptjs"),
      enabled: true,
      environmentInfo: {
        "app version": "123.0.1",
        "some other key": "some other value",
      },
      categories: [
        {
          name: "first",
        },
        {
          name: "second",
        },
      ],
    },
  },
  helpers: {
    CustomHelper: {
      require: "./helper.js",
    },
    ExpectHelper: {},
  },
};

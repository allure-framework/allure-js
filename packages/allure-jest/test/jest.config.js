/** @type {import('jest').Config} */
const config = {
  testRunner: "jest-circus/runner",
  testEnvironment: require.resolve("../dist/node"),
};

module.exports = config;

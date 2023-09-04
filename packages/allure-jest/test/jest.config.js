/** @type {import('jest').Config} */
const config = {
  testRunner: "jest-circus/runner",
  testEnvironment: require.resolve("../"),
};

module.exports = config;

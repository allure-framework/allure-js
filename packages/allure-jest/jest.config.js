/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testRunner: "jest-circus/runner",
  testEnvironment: require.resolve("allure-jest/node"),
};

module.exports = config;

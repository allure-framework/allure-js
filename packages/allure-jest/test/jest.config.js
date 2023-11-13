/** @type {import('jest').Config} */
const config = {
  testRunner: "jest-circus/runner",
  testEnvironment: require.resolve("../dist/node"),
  testEnvironmentOptions: {
    links: [
      {
        name: "issue",
        urlTemplate: "http://example.org/issues/%s",
      },
      {
        name: "tms",
        urlTemplate: "http://example.org/tasks/%s",
      },
    ],
  },
};

module.exports = config;

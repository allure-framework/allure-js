/** @type {import('jest').Config} */
const config = {
  testRunner: "jest-circus/runner",
  testEnvironment: require.resolve("../dist/node"),
  testEnvironmentOptions: {
    links: [
      {
        type: "issue",
        urlTemplate: "http://example.org/issues/%s",
      },
      {
        type: "tms",
        urlTemplate: "http://example.org/tasks/%s",
      },
    ],
  },
};

module.exports = config;

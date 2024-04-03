
    const config = {
      testEnvironment: require.resolve("allure-jest/node"),
      testEnvironmentOptions: {
        testMode: true,
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
  
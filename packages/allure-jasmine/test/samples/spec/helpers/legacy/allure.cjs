const fixture = `
  const AllureJasmineReporter = require("allure-jasmine");

  const reporter = new AllureJasmineReporter({
    testMode: true,
    links: {
      issue: {
        urlTemplate: "https://example.org/issues/%s",
      },
      tms: {
        urlTemplate: "https://example.org/tasks/%s",
      }
    },
    categories: [
      {
        name: "Sad tests",
        messageRegex: /.*Sad.*/,
        matchedStatuses: ["failed"],
      },
      {
        name: "Infrastructure problems",
        messageRegex: ".*RuntimeException.*",
        matchedStatuses: ["broken"],
      },
      {
        name: "Outdated tests",
        messageRegex: ".*FileNotFound.*",
        matchedStatuses: ["broken"],
      },
      {
        name: "Regression",
        messageRegex: ".*\\sException:.*",
        matchedStatuses: ["broken"],
      },
    ],
    environmentInfo: {
      envVar1: "envVar1Value",
      envVar2: "envVar2Value",
    },
  });

  jasmine.getEnv().addReporter(reporter);

  module.exports = { allure: reporter.getAllureInterface() };
`;

module.exports = fixture;

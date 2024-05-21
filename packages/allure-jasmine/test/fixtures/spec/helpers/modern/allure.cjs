const { LinkType, Status } = require("allure-js-commons/sdk/node");

const fixture = `
  const AllureJasmineReporter = require("allure-jasmine");

  const reporter = new AllureJasmineReporter({
    testMode: true,
    links: [
      {
        type: "${LinkType.ISSUE}",
        urlTemplate: "https://example.org/issues/%s",
      },
      {
        type: "${LinkType.TMS}",
        urlTemplate: "https://example.org/tasks/%s",
      }
    ],
    categories: [
      {
        name: "Sad tests",
        messageRegex: /.*Sad.*/,
        matchedStatuses: ["${Status.FAILED}"],
      },
      {
        name: "Infrastructure problems",
        messageRegex: ".*RuntimeException.*",
        matchedStatuses: ["${Status.BROKEN}"],
      },
      {
        name: "Outdated tests",
        messageRegex: ".*FileNotFound.*",
        matchedStatuses: ["${Status.BROKEN}"],
      },
      {
        name: "Regression",
        messageRegex: ".*\\sException:.*",
        matchedStatuses: ["${Status.BROKEN}"],
      },
    ],
    environmentInfo: {
      envVar1: "envVar1Value",
      envVar2: "envVar2Value",
    },
  });

  jasmine.getEnv().addReporter(reporter);
`;

module.exports = fixture;

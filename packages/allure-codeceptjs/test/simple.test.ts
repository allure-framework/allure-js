import { runTests } from "./fixtures";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {});
        Scenario("login-scenario2", async () => {});
      `,
      "logout.test.js": `
        Feature("logout-feature");
        Scenario("logout-scenario1", async () => {});
        Scenario("logout-scenario2", async () => {});
      `,
    },
  });
  const tests = res.tests;
  expect(tests.length).toBe(4);
  expect(tests).toBe(
    expect.array([
      {
        uuid: "df063e77-9398-4387-9040-d217e90042c2",
        historyId: "a9bfc003abdc102abd3fa50711659853",
        status: "passed",
        statusDetails: {},
        stage: "finished",
        steps: [],
        attachments: [],
        parameters: [],
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
        ],
        links: [],
        start: 1677680760756,
        name: "logout-scenario1",
        fullName: "logout.test.js#logout-scenario1",
        testCaseId: "a9bfc003abdc102abd3fa50711659853",
        stop: 1677680760759,
      },
      {
        historyId: "3e1ee873dfc32b563afd1b98ef26edf8",
        status: "passed",
        statusDetails: {},
        stage: "finished",
        steps: [],
        attachments: [],
        parameters: [],
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
        ],
        links: [],
        name: "logout-scenario2",
        fullName: "logout.test.js#logout-scenario2",
        testCaseId: "3e1ee873dfc32b563afd1b98ef26edf8",
      },
      {
        historyId: "e28383a4b2bfbdfb8434afa7ad20542f",
        status: "passed",
        stage: "finished",
        steps: [],
        attachments: [],
        parameters: [],
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
        ],
        links: [],
        name: "login-scenario1",
        fullName: "nested/login.test.js#login-scenario1",
        testCaseId: "e28383a4b2bfbdfb8434afa7ad20542f",
      },
      {
        historyId: "ece9c5b4007ade6cad00690df07c02d9",
        status: "passed",
        statusDetails: {},
        stage: "finished",
        steps: [],
        attachments: [],
        parameters: [],
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
        ],
        links: [],
        start: 1677680760762,
        name: "login-scenario2",
        fullName: "nested/login.test.js#login-scenario2",
        testCaseId: "ece9c5b4007ade6cad00690df07c02d9",
        stop: 1677680760763,
      },
    ]),
  );
});

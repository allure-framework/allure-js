import { expect } from "@jest/globals";

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

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: "passed",
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
          {
            name: "suite",
            value: "logout-feature",
          },
        ],
        name: "logout-scenario1",
        fullName: "logout.test.js#logout-scenario1",
        testCaseId: "a9bfc003abdc102abd3fa50711659853",
      }),

      expect.objectContaining({
        historyId: "3e1ee873dfc32b563afd1b98ef26edf8",
        status: "passed",
        stage: "finished",
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
          {
            name: "suite",
            value: "logout-feature",
          },
        ],
        name: "logout-scenario2",
        fullName: "logout.test.js#logout-scenario2",
        testCaseId: "3e1ee873dfc32b563afd1b98ef26edf8",
      }),
      expect.objectContaining({
        historyId: "e28383a4b2bfbdfb8434afa7ad20542f",
        status: "passed",
        stage: "finished",
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
          {
            name: "suite",
            value: "login-feature",
          },
        ],
        name: "login-scenario1",
        fullName: "nested/login.test.js#login-scenario1",
        testCaseId: "e28383a4b2bfbdfb8434afa7ad20542f",
      }),

      expect.objectContaining({
        historyId: "ece9c5b4007ade6cad00690df07c02d9",
        status: "passed",
        stage: "finished",
        labels: [
          {
            name: "language",
            value: "javascript",
          },
          {
            name: "framework",
            value: "codeceptjs",
          },
          { name: "suite", value: "login-feature" },
        ],
        name: "login-scenario2",
        fullName: "nested/login.test.js#login-scenario2",
        testCaseId: "ece9c5b4007ade6cad00690df07c02d9",
      }),
    ]),
  );
});

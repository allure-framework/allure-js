import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("handles simple scenarios", async () => {
  const { tests } = await runCodeceptJsInlineTest({
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
  });

  expect(tests).toHaveLength(4);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "logout-scenario1",
        fullName: "logout.test.js: logout-feature > logout-scenario1",
        testCaseId: "b1cbd7e3cf91f03aa08b912903a297a0",
        historyId: "b1cbd7e3cf91f03aa08b912903a297a0:d41d8cd98f00b204e9800998ecf8427e",
      }),

      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "logout-scenario2",
        fullName: "logout.test.js: logout-feature > logout-scenario2",
        testCaseId: "cf2fc4ae2f9143145a3ee3bae6dff66b",
        historyId: "cf2fc4ae2f9143145a3ee3bae6dff66b:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario1",
        fullName: "nested/login.test.js: login-feature > login-scenario1",
        testCaseId: "157be92d422d04e9b79d6d2fbb5020de",
        historyId: "157be92d422d04e9b79d6d2fbb5020de:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario2",
        fullName: "nested/login.test.js: login-feature > login-scenario2",
        testCaseId: "fbb987bcdcd21440bb0a4f4d79711387",
        historyId: "fbb987bcdcd21440bb0a4f4d79711387:d41d8cd98f00b204e9800998ecf8427e",
      }),
    ]),
  );
});

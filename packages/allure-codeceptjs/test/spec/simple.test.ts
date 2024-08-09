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
        testCaseId: "0bf4f9a26f520d0d5c2aa270918dd2bd",
        historyId: "0bf4f9a26f520d0d5c2aa270918dd2bd:d41d8cd98f00b204e9800998ecf8427e",
      }),

      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "logout-scenario2",
        fullName: "logout.test.js: logout-feature > logout-scenario2",
        testCaseId: "5607c1c83d9b64861ff559d525106c71",
        historyId: "5607c1c83d9b64861ff559d525106c71:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario1",
        fullName: "nested/login.test.js: login-feature > login-scenario1",
        testCaseId: "b63d78080eb28db70a46f9ecccf81927",
        historyId: "b63d78080eb28db70a46f9ecccf81927:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario2",
        fullName: "nested/login.test.js: login-feature > login-scenario2",
        testCaseId: "32c25d09db299433cdc0cef7a9254b40",
        historyId: "32c25d09db299433cdc0cef7a9254b40:d41d8cd98f00b204e9800998ecf8427e",
      }),
    ]),
  );
});

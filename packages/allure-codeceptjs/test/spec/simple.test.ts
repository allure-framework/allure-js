import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("simple scenarios", async () => {
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
        fullName: "logout.test.js#logout-scenario1",
        testCaseId: "a9bfc003abdc102abd3fa50711659853",
        historyId: "a9bfc003abdc102abd3fa50711659853:d41d8cd98f00b204e9800998ecf8427e",
      }),

      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "logout-scenario2",
        fullName: "logout.test.js#logout-scenario2",
        testCaseId: "3e1ee873dfc32b563afd1b98ef26edf8",
        historyId: "3e1ee873dfc32b563afd1b98ef26edf8:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario1",
        fullName: "nested/login.test.js#login-scenario1",
        testCaseId: "e28383a4b2bfbdfb8434afa7ad20542f",
        historyId: "e28383a4b2bfbdfb8434afa7ad20542f:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario2",
        fullName: "nested/login.test.js#login-scenario2",
        testCaseId: "ece9c5b4007ade6cad00690df07c02d9",
        historyId: "ece9c5b4007ade6cad00690df07c02d9:d41d8cd98f00b204e9800998ecf8427e",
      }),
    ]),
  );
});

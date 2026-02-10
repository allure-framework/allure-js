import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
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
        fullName: "dummy:logout.test.js: logout-feature > logout-scenario1",
        testCaseId: "eda0335a13829baf445a25f7f3183813",
        historyId: "eda0335a13829baf445a25f7f3183813:d41d8cd98f00b204e9800998ecf8427e",
      }),

      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "logout-scenario2",
        fullName: "dummy:logout.test.js: logout-feature > logout-scenario2",
        testCaseId: "bf828e36674defe3995294bf2aa475d7",
        historyId: "bf828e36674defe3995294bf2aa475d7:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario1",
        fullName: "dummy:nested/login.test.js: login-feature > login-scenario1",
        testCaseId: "090a2afe525cb9897eed2ea2543913a1",
        historyId: "090a2afe525cb9897eed2ea2543913a1:d41d8cd98f00b204e9800998ecf8427e",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario2",
        fullName: "dummy:nested/login.test.js: login-feature > login-scenario2",
        testCaseId: "7f8a96c5d7ea3db2f75c8dee77f732c2",
        historyId: "7f8a96c5d7ea3db2f75c8dee77f732c2:d41d8cd98f00b204e9800998ecf8427e",
      }),
    ]),
  );

  const logoutScenario = tests.find((test) => test.name === "logout-scenario1");
  expect(logoutScenario?.labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5(JSON.stringify(["logout.test.js", "logout-feature", "logout-scenario1"])),
      },
    ]),
  );
});

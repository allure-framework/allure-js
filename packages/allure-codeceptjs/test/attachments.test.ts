import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": /* js */ `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {
          const allure = codeceptjs.container.plugins("allure");
          allure.addAttachment("data.txt", "some data", "text/plain");
        });
      `,
    },
  });
  const attachments = res.tests[0]!.attachments;
  expect(attachments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "data.txt",
        type: "text/plain",
      }),
    ]),
  );
});

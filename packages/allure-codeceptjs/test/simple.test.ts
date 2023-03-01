import { runTests } from "./fixtures";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async ({}) => {});
        Scenario("login-scenario2", async ({}) => {});
      `,
      "logout.test.js": `
        Feature("logout-feature");
        Scenario("logout-scenario1", async ({}) => {});
        Scenario("logout-scenario2", async ({}) => {});
      `,
    },
  });
  expect(res.tests).toMatchInlineSnapshot();
});

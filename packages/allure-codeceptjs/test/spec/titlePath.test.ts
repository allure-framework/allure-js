import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should assign titlePath property to the test result", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "spec/test/sample.test.js": `
       Feature("login-feature");
       Scenario("login-scenario1", async () => {});
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["spec", "test", "sample.test.js", "login-feature"]);
});

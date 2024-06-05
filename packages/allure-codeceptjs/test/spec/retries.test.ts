import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../utils.js";

it("handles retries", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", { retries: 2 }, async ({ I }) => {
          I.fail();
        });
      `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "login-scenario1",
        parameters: expect.arrayContaining([
          {
            name: "Repetition",
            value: "1",
          },
        ]),
      }),
      expect.objectContaining({
        name: "login-scenario1",
        parameters: expect.arrayContaining([
          {
            name: "Repetition",
            value: "2",
          },
        ]),
      }),
      expect.objectContaining({
        name: "login-scenario1",
        parameters: expect.arrayContaining([
          {
            name: "Repetition",
            value: "3",
          },
        ]),
      }),
    ]),
  );
});

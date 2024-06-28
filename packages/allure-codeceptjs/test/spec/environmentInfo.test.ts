import { describe, expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../utils.js";

describe("environment info", () => {
  it("should add environmentInfo", async () => {
    const { envInfo } = await runCodeceptJsInlineTest({
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {});
        Scenario("login-scenario2", async () => {});
      `,
    });

    expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
  });
});

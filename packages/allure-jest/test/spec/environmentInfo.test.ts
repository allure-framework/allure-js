import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

describe("environment info", () => {
  it("should add environmentInfo", async () => {
    const { envInfo } = await runJestInlineTest({
      "sample.test.js": `
        it("sample test", async () => {});
      `,
    });

    expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
  });
});

import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils.js";

it("should add environment info", async () => {
  const { envInfo } = await runCucumberInlineTest(["simple"], ["simple"]);
  expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
});

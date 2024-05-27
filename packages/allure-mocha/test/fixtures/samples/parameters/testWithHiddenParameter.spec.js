// cjs: const { it } = require("mocha");
// cjs: const { parameter } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { parameter } from "allure-js-commons";

it("a test with a hidden parameter", async () => {
  await parameter("foo", "bar", { mode: "hidden" });
});

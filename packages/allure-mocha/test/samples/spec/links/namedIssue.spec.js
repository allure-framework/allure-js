// cjs: const { it } = require("mocha");
// cjs: const { issue } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { issue } from "allure-js-commons";

it("a test with a named issue link", async () => {
  await issue("https://foo.bar", "baz");
});

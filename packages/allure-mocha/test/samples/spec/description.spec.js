// cjs: const { it } = require("mocha");
// cjs: const { description } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { description } from "allure-js-commons";

it("a test with a description", async () => {
  await description("foo");
});

// cjs: const { it } = require("mocha");
// cjs: const { suite } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { suite } from "allure-js-commons";

it("a test with a suite", async () => {
  await suite("foo");
});

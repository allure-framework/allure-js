// cjs: const { it } = require("mocha");
// cjs: const { parentSuite } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { parentSuite } from "allure-js-commons";

it("a test with a parent suite", async () => {
  await parentSuite("foo");
});

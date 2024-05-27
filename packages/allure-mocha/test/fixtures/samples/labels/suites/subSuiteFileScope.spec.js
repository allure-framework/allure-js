// cjs: const { it } = require("mocha");
// cjs: const { subSuite } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { subSuite } from "allure-js-commons";

it("a test with a sub-suite", async () => {
  await subSuite("foo");
});

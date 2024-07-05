// cjs: const { it } = require("mocha");
// cjs: const { tag } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { tag } from "allure-js-commons";

it("a skipped test with a tag", async function () {
  await tag("foo");
  this.skip();
});

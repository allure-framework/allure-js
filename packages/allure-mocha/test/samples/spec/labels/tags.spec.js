// cjs: const { it } = require("mocha");
// cjs: const { tag } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { tag } from "allure-js-commons";

it("a test with tags", async () => {
  await tag("foo");
  await tag("bar");
});

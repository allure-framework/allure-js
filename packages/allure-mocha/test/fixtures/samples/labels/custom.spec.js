// cjs: const { it } = require("mocha");
// cjs: const { label } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { label } from "allure-js-commons";

it("a test with a custom label", async () => {
  await label("foo", "bar");
});

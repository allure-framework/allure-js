// cjs: const { it } = require("mocha");
// cjs: const { feature } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { feature } from "allure-js-commons";

it("a test with a feature", async () => {
  await feature("foo");
});

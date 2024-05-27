// cjs: const { it } = require("mocha");
// cjs: const { layer } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { layer } from "allure-js-commons";

it("a test with a layer", async () => {
  await layer("foo");
});

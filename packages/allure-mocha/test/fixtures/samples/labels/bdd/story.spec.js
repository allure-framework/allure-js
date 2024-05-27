// cjs: const { it } = require("mocha");
// cjs: const { story } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { story } from "allure-js-commons";

it("a test with a story", async () => {
  await story("foo");
});

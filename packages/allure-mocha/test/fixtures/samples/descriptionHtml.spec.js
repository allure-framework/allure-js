// cjs: const { it } = require("mocha");
// cjs: const { descriptionHtml } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { descriptionHtml } from "allure-js-commons";

it("a test with a description in HTML", async () => {
  await descriptionHtml("foo");
});

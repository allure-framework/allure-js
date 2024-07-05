// cjs: const { it } = require("mocha");
// cjs: const { link } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { link } from "allure-js-commons";

it("a test with a named link", async () => {
  await link("https://foo.bar", "baz");
});

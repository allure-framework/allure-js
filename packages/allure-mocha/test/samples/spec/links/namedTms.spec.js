// cjs: const { it } = require("mocha");
// cjs: const { tms } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { tms } from "allure-js-commons";

it("a test with a named tms link", async () => {
  await tms("https://foo.bar", "baz");
});

// cjs: const { it } = require("mocha");
// cjs: const { epic } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { epic } from "allure-js-commons";

it("a test with an epic", async () => {
  await epic("foo");
});

// cjs: const { it } = require("mocha");
// cjs: const { displayName } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { displayName } from "allure-js-commons";

it("a renamed test", async () => {
  await displayName("foo");
});

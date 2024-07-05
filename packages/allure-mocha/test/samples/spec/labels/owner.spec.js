// cjs: const { it } = require("mocha");
// cjs: const { owner } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { owner } from "allure-js-commons";

it("a test with an owner", async () => {
  await owner("foo");
});

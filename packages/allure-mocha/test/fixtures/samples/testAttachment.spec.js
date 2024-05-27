// cjs: const { it } = require("mocha");
// cjs: const { attachment } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { attachment } from "allure-js-commons";

it("test attachment", async () => {
  await attachment("foo.txt", Buffer.from("bar"), "text/plain");
});

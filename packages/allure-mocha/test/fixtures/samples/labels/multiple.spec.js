// cjs: const { it } = require("mocha");
// cjs: const { labels } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { labels } from "allure-js-commons";

it("a test with two custom labels", async () => {
  await labels({ name: "foo", value: "bar" }, { name: "baz", value: "qux" });
});

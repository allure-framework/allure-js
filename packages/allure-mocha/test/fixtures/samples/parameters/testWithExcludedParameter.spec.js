// cjs: const { it } = require("mocha");
// cjs: const { parameter } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { parameter } from "allure-js-commons";

["bar", "baz"].forEach((v) => {
  it("a test with an excluded parameter", async () => {
    await parameter("foo", v, { excluded: true });
  });
});

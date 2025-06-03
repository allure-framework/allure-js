// cjs: const { it } = require("mocha");
// cjs: const { attachment } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { attachment } from "allure-js-commons";

it("sample test", async () => {});

describe("foo", () => {
  describe("bar", () => {
    it("sample test", async () => {});
  });
});

// cjs: const { it } = require("mocha");
// esm: import { it } from "mocha";

it("muted test @allure.id=77", () => {
  throw new Error("muted body executed");
});
it("survivor @allure.id=78", () => {});

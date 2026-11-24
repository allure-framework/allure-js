// cjs: const { it } = require("mocha");
// esm: import { it } from "mocha";

it("excluded test @allure.id=77", () => {
  throw new Error("excluded body executed");
});
it("survivor @allure.id=78", () => {});

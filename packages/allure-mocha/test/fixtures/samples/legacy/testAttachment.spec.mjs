import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("test attachment", () => {
  allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
});

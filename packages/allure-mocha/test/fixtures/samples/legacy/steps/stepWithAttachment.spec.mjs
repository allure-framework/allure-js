import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a step with an attachment", () => {
  allure.step("step", () => {
    allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
});

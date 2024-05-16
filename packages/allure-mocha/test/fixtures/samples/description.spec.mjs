import { it } from "mocha";
import { description } from "allure-js-commons";

it("a test with a description", async () => {
  await description("foo");
});

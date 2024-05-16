import { it } from "mocha";
import { description } from "allure-js-commons/new";

it("a test with a description", async () => {
  await description("foo");
});

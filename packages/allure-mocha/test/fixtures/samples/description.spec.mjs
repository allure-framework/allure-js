import { description } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a description", async () => {
  await description("foo");
});

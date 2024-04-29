import { description } from "allure-js-commons/new";
import { it } from "mocha";

it("description", async () => {
  await description("foo");
});

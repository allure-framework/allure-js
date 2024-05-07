import { label } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a custom label", async () => {
  await label("foo", "bar");
});

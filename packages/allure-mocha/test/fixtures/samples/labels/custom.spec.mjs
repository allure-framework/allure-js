import { it } from "mocha";
import { label } from "allure-js-commons";

it("a test with a custom label", async () => {
  await label("foo", "bar");
});

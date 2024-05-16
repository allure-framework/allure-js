import { it } from "mocha";
import { feature } from "allure-js-commons";

it("a test with a feature", async () => {
  await feature("foo");
});

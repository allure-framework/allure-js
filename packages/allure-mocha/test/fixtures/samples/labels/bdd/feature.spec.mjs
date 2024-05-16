import { it } from "mocha";
import { feature } from "allure-js-commons/new";

it("a test with a feature", async () => {
  await feature("foo");
});

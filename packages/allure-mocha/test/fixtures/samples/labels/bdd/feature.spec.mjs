import { feature } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a feature", async () => {
  await feature("foo");
});

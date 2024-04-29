import { feature } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-feature", async () => {
  await feature("foo");
});

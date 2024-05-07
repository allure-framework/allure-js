import { layer } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a layer", async () => {
  await layer("foo");
});

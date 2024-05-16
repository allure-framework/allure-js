import { it } from "mocha";
import { layer } from "allure-js-commons/new";

it("a test with a layer", async () => {
  await layer("foo");
});

import { layer } from "allure-js-commons/new";
import { it } from "mocha";

it("layer", async () => {
  await layer("foo");
});

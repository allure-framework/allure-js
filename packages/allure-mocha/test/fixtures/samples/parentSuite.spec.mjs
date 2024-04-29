import { parentSuite } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-parentSuite", async () => {
  await parentSuite("foo");
});

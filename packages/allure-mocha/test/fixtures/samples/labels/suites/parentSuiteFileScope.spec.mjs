import { parentSuite } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a parent suite", async () => {
  await parentSuite("foo");
});

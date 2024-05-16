import { it } from "mocha";
import { parentSuite } from "allure-js-commons/new";

it("a test with a parent suite", async () => {
  await parentSuite("foo");
});

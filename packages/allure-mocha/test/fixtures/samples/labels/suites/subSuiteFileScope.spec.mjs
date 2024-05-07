import { subSuite } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a sub-suite", async () => {
  await subSuite("foo");
});

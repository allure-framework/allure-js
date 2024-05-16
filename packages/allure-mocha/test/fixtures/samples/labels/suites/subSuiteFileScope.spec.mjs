import { it } from "mocha";
import { subSuite } from "allure-js-commons";

it("a test with a sub-suite", async () => {
  await subSuite("foo");
});

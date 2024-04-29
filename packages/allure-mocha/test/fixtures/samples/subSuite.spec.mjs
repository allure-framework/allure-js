import { subSuite } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-subSuite", async () => {
  await subSuite("foo");
});

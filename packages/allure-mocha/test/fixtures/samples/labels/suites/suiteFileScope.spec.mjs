import { suite } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a suite", async () => {
  await suite("foo");
});

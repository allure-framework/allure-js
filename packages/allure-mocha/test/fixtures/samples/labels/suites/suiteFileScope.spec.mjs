import { it } from "mocha";
import { suite } from "allure-js-commons/new";

it("a test with a suite", async () => {
  await suite("foo");
});

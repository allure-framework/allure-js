import { suite } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-suite", async () => {
  await suite("foo");
});

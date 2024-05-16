import { it } from "mocha";
import { issue } from "allure-js-commons";

it("a test with a named issue link", async () => {
  await issue("https://foo.bar", "baz");
});

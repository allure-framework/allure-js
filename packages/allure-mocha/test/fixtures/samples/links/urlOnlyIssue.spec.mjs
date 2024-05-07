import { issue } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a url only issue link", async () => {
  await issue("https://foo.bar");
});

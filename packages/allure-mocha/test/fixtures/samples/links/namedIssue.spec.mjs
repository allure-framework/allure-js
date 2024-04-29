import { issue } from "allure-js-commons/new";
import { it } from "mocha";

it("named issue", async () => {
  await issue("https://foo.bar", "baz");
});

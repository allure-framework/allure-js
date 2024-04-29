import { issue } from "allure-js-commons/new";
import { it } from "mocha";

it("url only issue", async () => {
  await issue("https://foo.bar");
});

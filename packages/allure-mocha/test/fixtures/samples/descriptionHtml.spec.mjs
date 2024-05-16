import { it } from "mocha";
import { descriptionHtml } from "allure-js-commons/new";

it("a test with a description in HTML", async () => {
  await descriptionHtml("foo");
});

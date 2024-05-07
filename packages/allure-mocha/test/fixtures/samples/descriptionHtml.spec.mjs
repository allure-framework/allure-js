import { descriptionHtml } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a description in HTML", async () => {
  await descriptionHtml("foo");
});

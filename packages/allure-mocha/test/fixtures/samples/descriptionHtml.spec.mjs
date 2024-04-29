import { descriptionHtml } from "allure-js-commons/new";
import { it } from "mocha";

it("descriptionHtml", async () => {
  await descriptionHtml("foo");
});

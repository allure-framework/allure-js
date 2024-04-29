import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("url only link", async () => {
  await link("https://foo.bar");
});

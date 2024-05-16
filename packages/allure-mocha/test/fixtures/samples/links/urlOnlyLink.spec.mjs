import { it } from "mocha";
import { link } from "allure-js-commons";

it("a test with a url only link", async () => {
  await link("https://foo.bar");
});

import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a url only link", async () => {
  await link("https://foo.bar");
});

import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("link type", async () => {
  await link("https://foo.bar", "baz");
});

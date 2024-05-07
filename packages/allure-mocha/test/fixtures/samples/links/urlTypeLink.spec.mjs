import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a link of a custom type", async () => {
  await link("https://foo.bar", "baz");
});

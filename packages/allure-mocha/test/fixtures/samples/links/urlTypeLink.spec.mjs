import { it } from "mocha";
import { link } from "allure-js-commons/new";

it("a test with a link of a custom type", async () => {
  await link("https://foo.bar", "baz");
});

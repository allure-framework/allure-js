import { it } from "mocha";
import { link } from "allure-js-commons";

it("a test with a named link", async () => {
  await link("https://foo.bar", "link", "baz");
});

import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a named link", async () => {
  await link("https://foo.bar", "link", "baz");
});

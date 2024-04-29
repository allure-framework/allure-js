import { link } from "allure-js-commons/new";
import { it } from "mocha";

it("named link", async () => {
  await link("https://foo.bar", "link", "baz");
});

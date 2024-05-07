import { links } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with two links", async () => {
  await links({
    url: "https://foo.bar",
    type: "link",
    name: "baz"
  }, {
    url: "https://roo.rar",
    type: "link",
    name: "raz"
  });
});

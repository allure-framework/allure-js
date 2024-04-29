import { tag } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-tags", async () => {
  await tag("foo");
  await tag("bar");
});

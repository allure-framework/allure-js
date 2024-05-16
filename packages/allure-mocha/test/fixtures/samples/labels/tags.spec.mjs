import { it } from "mocha";
import { tag } from "allure-js-commons/new";

it("a test with tags", async () => {
  await tag("foo");
  await tag("bar");
});

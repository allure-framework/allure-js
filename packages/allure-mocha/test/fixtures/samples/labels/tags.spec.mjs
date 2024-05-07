import { tag } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with tags", async () => {
  await tag("foo");
  await tag("bar");
});

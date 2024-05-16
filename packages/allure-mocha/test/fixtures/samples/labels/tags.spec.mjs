import { it } from "mocha";
import { tag } from "allure-js-commons";

it("a test with tags", async () => {
  await tag("foo");
  await tag("bar");
});

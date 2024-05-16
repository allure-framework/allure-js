import { it } from "mocha";
import { displayName } from "allure-js-commons";

it("a renamed test", async () => {
  await displayName("foo");
});

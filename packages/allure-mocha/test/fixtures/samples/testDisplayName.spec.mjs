import { displayName } from "allure-js-commons/new";
import { it } from "mocha";

it("a renamed test", async () => {
  await displayName("foo");
});

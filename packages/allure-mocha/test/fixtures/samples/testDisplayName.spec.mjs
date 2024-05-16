import { it } from "mocha";
import { displayName } from "allure-js-commons/new";

it("a renamed test", async () => {
  await displayName("foo");
});

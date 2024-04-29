import { displayName } from "allure-js-commons/new";
import { it } from "mocha";

it("displayName", async () => {
  await displayName("foo");
});

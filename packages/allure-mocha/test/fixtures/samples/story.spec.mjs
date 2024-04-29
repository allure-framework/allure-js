import { story } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-story", async () => {
  await story("foo");
});

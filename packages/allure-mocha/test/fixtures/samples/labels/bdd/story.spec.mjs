import { it } from "mocha";
import { story } from "allure-js-commons";

it("a test with a story", async () => {
  await story("foo");
});

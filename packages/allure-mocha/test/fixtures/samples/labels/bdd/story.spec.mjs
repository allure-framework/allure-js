import { it } from "mocha";
import { story } from "allure-js-commons/new";

it("a test with a story", async () => {
  await story("foo");
});

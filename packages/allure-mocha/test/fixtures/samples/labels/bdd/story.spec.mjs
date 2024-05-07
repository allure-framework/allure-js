import { story } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a story", async () => {
  await story("foo");
});

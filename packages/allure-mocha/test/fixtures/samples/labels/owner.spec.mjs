import { it } from "mocha";
import { owner } from "allure-js-commons";

it("a test with an owner", async () => {
  await owner("foo");
});

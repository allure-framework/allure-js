import { it } from "mocha";
import { owner } from "allure-js-commons/new";

it("a test with an owner", async () => {
  await owner("foo");
});

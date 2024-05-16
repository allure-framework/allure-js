import { it } from "mocha";
import { epic } from "allure-js-commons";

it("a test with an epic", async () => {
  await epic("foo");
});

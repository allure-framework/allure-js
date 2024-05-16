import { it } from "mocha";
import { epic } from "allure-js-commons/new";

it("a test with an epic", async () => {
  await epic("foo");
});

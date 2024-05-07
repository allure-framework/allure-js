import { epic } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with an epic", async () => {
  await epic("foo");
});

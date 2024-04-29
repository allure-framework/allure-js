import { epic } from "allure-js-commons/new";
import { it } from "mocha";

it("dynamic-epic", async () => {
  await epic("foo");
});

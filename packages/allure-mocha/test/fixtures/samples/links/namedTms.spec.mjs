import { tms } from "allure-js-commons/new";
import { it } from "mocha";

it("named tms", async () => {
  await tms("https://foo.bar", "baz");
});

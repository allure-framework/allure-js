import { tms } from "allure-js-commons/new";
import { it } from "mocha";

it("url only tms", async () => {
  await tms("https://foo.bar");
});

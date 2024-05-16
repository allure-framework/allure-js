import { it } from "mocha";
import { tms } from "allure-js-commons/new";

it("a test with a url only tms link", async () => {
  await tms("https://foo.bar");
});

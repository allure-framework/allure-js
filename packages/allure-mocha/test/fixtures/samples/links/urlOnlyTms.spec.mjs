import { tms } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with a url only tms link", async () => {
  await tms("https://foo.bar");
});

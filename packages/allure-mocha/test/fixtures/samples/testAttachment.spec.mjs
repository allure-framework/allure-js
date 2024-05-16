import { it } from "mocha";
import { attachment } from "allure-js-commons";

it("test attachment", async () => {
  await attachment("foo.txt", Buffer.from("bar"), "text/plain");
});

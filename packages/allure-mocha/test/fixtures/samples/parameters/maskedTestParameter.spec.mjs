import { it } from "mocha";
import { parameter } from "allure-js-commons/new";

it("masked test parameter", async () => {
  await parameter("foo", "bar", { mode: "masked" });
});

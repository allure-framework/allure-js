import { it } from "mocha";
import { parameter } from "allure-js-commons";

it("a test with a masked parameter", async () => {
  await parameter("foo", "bar", { mode: "masked" });
});

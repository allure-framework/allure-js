import { it } from "mocha";
import { parameter } from "allure-js-commons/new";

it("hidden test parameter", async () => {
  await parameter("foo", "bar", { mode: "hidden" });
});

import { it } from "mocha";
import { parameter } from "allure-js-commons/new";

["bar", "baz"].forEach((v) => {
  it("a test with a parameter", async () => {
    await parameter("foo", v);
  });
});
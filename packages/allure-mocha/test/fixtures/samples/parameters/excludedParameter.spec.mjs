import { it } from "mocha";
import { parameter } from "allure-js-commons/new";

["bar", "baz"].forEach((v) => {
  it("excluded parameter", async () => {
    await parameter("foo", v, { excluded: true });
  });
});

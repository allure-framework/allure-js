import { it } from "mocha";
import { parameter } from "allure-js-commons";

["bar", "baz"].forEach((v) => {
  it("a test with an excluded parameter", async () => {
    await parameter("foo", v, { excluded: true });
  });
});

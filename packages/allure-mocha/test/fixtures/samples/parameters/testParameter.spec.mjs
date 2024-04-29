import { it } from "mocha";
import { parameter } from "allure-js-commons/new";

["bar", "baz"].forEach((v) => {
  it("test parameter", async () => {
    await parameter("foo", v);
  });
});

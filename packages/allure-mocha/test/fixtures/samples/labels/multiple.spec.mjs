import { labels } from "allure-js-commons/new";
import { it } from "mocha";

it("a test with two custom labels", async () => {
  await labels(
    { name: "foo", value: "bar"},
    { name: "baz", value: "qux"},
  );
});

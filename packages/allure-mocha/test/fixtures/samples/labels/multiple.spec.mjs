import { it } from "mocha";
import { labels } from "allure-js-commons/new";

it("a test with two custom labels", async () => {
  await labels({ name: "foo", value: "bar" }, { name: "baz", value: "qux" });
});

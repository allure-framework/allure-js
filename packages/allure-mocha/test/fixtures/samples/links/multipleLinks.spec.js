// cjs: const { it } = require("mocha");
// cjs: const { links } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { links } from "allure-js-commons";

it("a test with two links", async () => {
  await links(
    {
      url: "https://foo.bar",
      type: "link",
      name: "baz",
    },
    {
      url: "https://roo.rar",
      type: "link",
      name: "raz",
    },
  );
});

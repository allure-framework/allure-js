// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// cjs: const { Status } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";
// esm: import { Status } from "allure-js-commons";

it("a test run with categories", () => {
  allure.writeCategoriesDefinitions([
    {
      name: "foo",
      description: "bar",
      messageRegex: "broken",
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: "baz",
      description: "qux",
      messageRegex: "failure",
      matchedStatuses: [Status.FAILED],
    },
  ]);
});

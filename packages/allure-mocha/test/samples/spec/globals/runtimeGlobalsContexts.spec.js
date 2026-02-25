// cjs: const { after, before, it } = require("mocha");
// cjs: const { globalAttachment, globalError } = require("allure-js-commons");
// esm: import { after, before, it } from "mocha";
// esm: import { globalAttachment, globalError } from "allure-js-commons";

void globalError({ message: "module scope error" });

before(async () => {
  await globalAttachment("before-log", "before", { contentType: "text/plain" });
});

after(async () => {
  await globalError({ message: "after hook error" });
});

it("a test with hook contexts", () => {});

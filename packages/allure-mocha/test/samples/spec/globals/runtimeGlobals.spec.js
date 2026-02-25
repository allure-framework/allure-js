// cjs: const { it } = require("mocha");
// cjs: const { writeFileSync } = require("node:fs");
// cjs: const { join } = require("node:path");
// cjs: const { globalAttachment, globalAttachmentPath, globalError } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { writeFileSync } from "node:fs";
// esm: import { join } from "node:path";
// esm: import { globalAttachment, globalAttachmentPath, globalError } from "allure-js-commons";

it("a test", async () => {
  const pathAttachmentFile = join(process.cwd(), "global-path.log");
  writeFileSync(pathAttachmentFile, "hello-from-path", "utf8");

  await globalAttachment("global-log", "hello", { contentType: "text/plain" });
  await globalAttachmentPath("global-log-path", pathAttachmentFile, { contentType: "text/plain" });
  await globalError({ message: "global setup failed", trace: "stack" });
});

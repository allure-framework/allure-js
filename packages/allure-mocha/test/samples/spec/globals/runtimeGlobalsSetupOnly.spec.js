// cjs: const { writeFileSync } = require("node:fs");
// cjs: const { join } = require("node:path");
// cjs: const { globalAttachment, globalAttachmentPath, globalError } = require("allure-js-commons");
// esm: import { writeFileSync } from "node:fs";
// esm: import { join } from "node:path";
// esm: import { globalAttachment, globalAttachmentPath, globalError } from "allure-js-commons";

const setupFilePath = join(process.cwd(), "setup-only.log");
writeFileSync(setupFilePath, "from-path", "utf8");

globalAttachment("setup-inline-log", "from-inline", { contentType: "text/plain" });
globalAttachmentPath("setup-file-log", setupFilePath, { contentType: "text/plain" });
globalError({ message: "setup-only error", trace: "setup stack" });

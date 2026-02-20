it("a test", async () => {
  const { writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { globalAttachment, globalAttachmentPath, globalError } = await import("allure-js-commons");
  const pathAttachmentFile = join(process.cwd(), "global-path.log");
  writeFileSync(pathAttachmentFile, "hello-from-path", "utf8");

  await globalAttachment("global-log", "hello", { contentType: "text/plain" });
  await globalAttachmentPath("global-log-path", pathAttachmentFile, { contentType: "text/plain" });
  await globalError({ message: "global setup failed", trace: "stack" });
});

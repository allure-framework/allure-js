let isSent = false;

before(async () => {
  if (isSent) {
    return;
  }

  isSent = true;
  const { globalAttachment, globalError } = await import("allure-js-commons");
  await globalAttachment("global-log", "hello", { contentType: "text/plain" });
  await globalError({ message: "global setup failed", trace: "stack" });
});

it("a test", () => {});

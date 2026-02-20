void (async () => {
  const { globalError } = await import("allure-js-commons");
  await globalError({ message: "module scope error" });
})();

before(async () => {
  const { globalAttachment } = await import("allure-js-commons");
  await globalAttachment("before-log", "before", { contentType: "text/plain" });
});

after(async () => {
  const { globalError } = await import("allure-js-commons");
  await globalError({ message: "after hook error" });
});

it("a test with hook contexts", () => {});

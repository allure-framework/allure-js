it("passed", async ({ browser, currentTest }) => {
  await browser.step(currentTest.id, "first step name", async (s1) => {
    await s1.step("second step name", async (s2) => {
      await s2.step("third step name", (s3) => {
        s3.label("foo", "bar");
      });
    });
  });
});

it("failed", async ({ browser, currentTest }) => {
  await browser.step(currentTest.id, "first step name", async (s1) => {
    await s1.step("second step name", async (s2) => {
      await s2.step("third step name", (s3) => {
        throw new Error("foo");
      });
    });
  });
});

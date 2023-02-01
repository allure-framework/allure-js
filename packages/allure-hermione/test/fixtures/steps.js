it("adds custom steps", async ({ browser, currentTest }) => {
  await browser.step(currentTest.id(), "first step name", async (s1) => {
    const screenshot = await browser.takeScreenshot();

    s1.attach(screenshot, "image/png");

    await s1.step("second step name", async (s2) => {
      s2.attach(JSON.stringify({ foo: "bar" }), "application/json");

      await s2.step("third step name", (s3) => {
        s3.label("foo", "bar");
        s3.attach(JSON.stringify({ foo: "bar" }), "application/json");
      });
    });
  });
});

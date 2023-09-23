const { allure } = require("../../dist/runtime");

it("passed", async ({ browser }) => {
  await allure(browser).step("first step name", async (s1) => {
    await s1.step("second step name", async (s2) => {
      await s2.step("third step name", (s3) => {
        s3.label("foo", "bar");
      });
    });
  });
});

it("failed", async ({ browser }) => {
  await allure(browser).step("first step name", async (s1) => {
    await s1.step("second step name", async (s2) => {
      await s2.step("third step name", (s3) => {
        throw new Error("foo");
      });
    });
  });
});

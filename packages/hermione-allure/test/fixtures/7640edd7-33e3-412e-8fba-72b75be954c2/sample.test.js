
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async ({ currentTest }) => {
        await allure(currentTest).step("foo", async () => {});
        await allure(currentTest).step("bar", async () => {});
        await allure(currentTest).step("baz", async () => {});
      });
    

      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async ({ currentTest }) => {
        await allure(currentTest).step("foo", async () => {
          await allure(currentTest).label("foo", "bar");
          await allure(currentTest).link("http://example.com", "example");
        });
      });
    
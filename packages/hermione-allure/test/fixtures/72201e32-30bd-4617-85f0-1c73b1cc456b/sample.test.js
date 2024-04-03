
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("issue", async ({ currentTest }) => {
        await allure(currentTest).issue("https://example.org", "foo");
        await allure(currentTest).issue("1", "bar");
        await allure(currentTest).issue("2", "baz");
      });
    
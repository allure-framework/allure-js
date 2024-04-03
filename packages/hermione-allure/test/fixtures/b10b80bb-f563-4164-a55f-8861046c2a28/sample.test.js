
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async ({ currentTest }) => {
        await allure(currentTest).link("https://example.org", "bar", "foo");
      });
    

      const { allure } = require("hermione-allure/dist/runtime.js");

      it("display name", async ({ currentTest }) => {
        await allure(currentTest).displayName("foo");
      });
    
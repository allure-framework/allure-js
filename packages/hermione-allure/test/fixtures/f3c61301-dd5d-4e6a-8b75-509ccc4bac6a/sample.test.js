
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("history id", async ({ currentTest }) => {
        await allure(currentTest).historyId("foo");
      });
    
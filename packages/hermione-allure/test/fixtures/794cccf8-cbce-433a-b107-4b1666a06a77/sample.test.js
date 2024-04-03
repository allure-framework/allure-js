
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("epic", async ({ currentTest }) => {
        await allure(currentTest).epic("foo");
      });
    
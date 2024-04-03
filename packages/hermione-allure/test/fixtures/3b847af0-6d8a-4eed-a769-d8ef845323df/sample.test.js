
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("severity", async ({ currentTest }) => {
        await allure(currentTest).severity("foo");
      });
    
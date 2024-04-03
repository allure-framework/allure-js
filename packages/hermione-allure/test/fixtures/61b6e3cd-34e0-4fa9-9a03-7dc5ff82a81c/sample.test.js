
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("suite", async ({ currentTest }) => {
        await allure(currentTest).suite("foo");
      });
    
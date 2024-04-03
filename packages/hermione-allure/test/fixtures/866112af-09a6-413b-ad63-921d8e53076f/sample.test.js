
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("allureId", async ({ currentTest }) => {
        await allure(currentTest).id("42");
      });
    
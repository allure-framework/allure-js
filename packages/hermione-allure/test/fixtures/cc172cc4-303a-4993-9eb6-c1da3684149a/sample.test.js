
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("subSuite", async ({ currentTest }) => {
        await allure(currentTest).subSuite("foo");
      });
    
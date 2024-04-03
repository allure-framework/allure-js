
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("parentSuite", async ({ currentTest }) => {
        await allure(currentTest).parentSuite("foo");
      });
    

      const { allure } = require("hermione-allure/dist/runtime.js");

      it("test case id", async ({ currentTest }) => {
        await allure(currentTest).testCaseId("foo");
      });
    
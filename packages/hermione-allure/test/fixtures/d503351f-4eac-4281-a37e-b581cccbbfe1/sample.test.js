
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async ({ currentTest }) => {
        await allure(currentTest).step("foo", async () => {
          await allure(currentTest).attachment("foo", "text/plain", "attachment name");
        });
      });
    
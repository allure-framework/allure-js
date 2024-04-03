
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async ({ currentTest }) => {
        await allure(currentTest).attachment(JSON.stringify({ foo: "bar" }), "application/json", "foo");
      });
    

      const { allure } = require("hermione-allure/dist/runtime.js");

      it("parameter", async ({ currentTest }) => {
        await allure(currentTest).parameter("foo", "bar", {
          excluded: false,
          mode: "hidden",
        });
      });
    
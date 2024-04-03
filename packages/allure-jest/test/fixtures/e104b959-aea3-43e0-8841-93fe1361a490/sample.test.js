
      it("parameter", async () => {
        await allure.parameter("foo", "bar", {
          excluded: false,
          mode: "hidden",
        });
      })
    
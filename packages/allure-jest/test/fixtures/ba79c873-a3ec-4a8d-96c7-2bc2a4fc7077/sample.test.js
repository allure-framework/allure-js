
    it("json", () => {
      allure.attachment(JSON.stringify({ foo: "bar" }), "application/json");
    });
  
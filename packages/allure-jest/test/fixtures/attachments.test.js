it("json", () => {
  allure.attachment(JSON.stringify({ foo: "bar" }), "application/json");
});

it("name", () => {
  allure.attachment(JSON.stringify({ foo: "bar" }), "application/json", "Request Body");
});

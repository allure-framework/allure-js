it("custom", () => {
  allure.parameter("foo", "bar", {
    excluded: false,
    mode: "hidden",
  });
});

it("custom", () => {
  allure.link("http://example.org", "bar", "foo");
});

it("tms", () => {
  allure.tms("foo", "1");
});

it("issue", () => {
  allure.issue("foo", "1");
});

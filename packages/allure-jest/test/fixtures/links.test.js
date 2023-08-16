it("custom", () => {
  allure.link("http://example.org", "bar", "foo");
});

it("tms", () => {
  allure.tms("foo", "http://example.org");
});

it("issue", () => {
  allure.issue("foo", "http://example.org");
});

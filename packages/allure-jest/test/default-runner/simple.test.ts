import allure from "./allure-report"

describe("test", () => {
  it("simple", () => {
    allure.feature("Feature")
  });
});

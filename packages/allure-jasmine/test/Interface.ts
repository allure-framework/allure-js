import { allure } from "./Setup";
import { Severity } from "allure-js-commons";

describe("Suite interface", function() {
  it("Test description", function() {
    allure.description("**This is MD description of test**");
    expect(1).toEqual(1);
  });

  it("Test description HTML", function() {
    allure.descriptionHtml("<h1>This is HTML description of test</h1>");
    expect(1).toEqual(1);
  });

  it("Test owner", function() {
    allure.owner("korobochka");
    expect(1).toEqual(1);
  });

  it("Test severity", function() {
    allure.severity(Severity.CRITICAL);
    expect(1).toEqual(1);
  });

  it("Test issue", function() {
    allure.issue("ISSUE-12345", "");
    expect(1).toEqual(2);
  });

  it("Test tag", function() {
    allure.tag("SMOKE");
    expect(1).toEqual(1);
  });

  it("Test link", function() {
    allure.link("https://yandex.ru", "Yandex");
    expect(1).toEqual(1);
  });
});

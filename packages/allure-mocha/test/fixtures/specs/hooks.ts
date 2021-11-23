import { ContentType } from "allure-js-commons";
import { expect } from "chai";
import { allure } from "../../../runtime";

describe("hooks test", () => {
  describe("before fails", () => {
    before(function () {
      throw new Error("In before");
    });

    it("never runs", () => {});
  });

  describe("after fails", () => {
    it("fails in after", () => {});

    after(function () {
      throw new Error("In after");
    });
  });

  describe("beforeEach fails", () => {
    beforeEach(function () {
      allure.attachment("saved in beforeEach", "should be saved", ContentType.TEXT);
      throw new Error("In before each");
    });

    it("test with beforeEach", () => {});
  });

  describe("afterEach fails", () => {
    afterEach(function () {
      allure.attachment("saved in afterEach", "should be saved", ContentType.TEXT);
      throw new Error("In after each");
    });

    it("passed test with afterEach", () => {});
  });

  describe("both afterEach and test fail", () => {
    afterEach(function () {
      allure.attachment("saved in afterEach", "should be saved", ContentType.TEXT);
      throw new Error("In after each");
    });

    it("failed test with afterEach", () => {
      expect(1).eq(2);
    });
  });

  describe("named hooks", () => {
    beforeEach("some beforeEach name", () => {
    })
    it("named hooks test", () => {
    })
    afterEach("some afterEach name", () => {
    })
  })
});

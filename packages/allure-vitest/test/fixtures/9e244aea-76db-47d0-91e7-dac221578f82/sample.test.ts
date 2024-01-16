
    import { allureTest } from "allure-vitest/test";

    allureTest("test case id", ({ allure }) => {
      allure.testCaseId("foo");
    });
  
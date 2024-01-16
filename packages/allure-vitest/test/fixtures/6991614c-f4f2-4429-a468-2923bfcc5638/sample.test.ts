
    import { allureTest } from "allure-vitest/test";

    allureTest("history id", ({ allure }) => {
      allure.historyId("foo");
    });
  
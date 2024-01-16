
      import { allureTest } from "allure-vitest/test";

      allureTest("issue", ({ allure }) => {
        allure.issue("foo", "https://example.org/issue/1");
        allure.issue("bar", "2");
      });
    

      import { allureTest } from "allure-vitest/test";

      allureTest("epic", ({ allure }) => {
        allure.epic("foo");
      });
    
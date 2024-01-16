
    import { allureTest } from "allure-vitest/test";

    allureTest("display name", ({ allure }) => {
      allure.displayName("foo");
    });
  
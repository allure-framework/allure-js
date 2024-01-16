
    import { allureTest } from "allure-vitest/test";

    allureTest("parameter", ({ allure }) => {
      allure.parameter("foo", "bar", { mode: "hidden", excluded: true });
    });
  
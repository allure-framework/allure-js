
    import { allureTest } from "allure-vitest/test";

    allureTest("description html", ({ allure }) => {
      allure.descriptionHtml("foo");
    });
  
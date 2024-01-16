
    import { allureTest } from "allure-vitest/test";

    allureTest("text attachment", ({ allure }) => {
      allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
    });
  
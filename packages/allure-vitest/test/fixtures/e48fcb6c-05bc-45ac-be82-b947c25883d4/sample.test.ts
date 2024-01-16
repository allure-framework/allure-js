
    import { allureTest } from "allure-vitest/test";

    allureTest("steps", async ({ allure }) => {
      await allure.step("step", () => {
        allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
      });
    });
  

    import { test, expect } from '@playwright/test';
    import { label } from "allure-playwright";

    test("should add epic label", async ({}, testInfo) => {
      await label("foo", "bar");

      // allure.labels(...[{name: "test", value: 'testValue'}, {name: "test2", value: 'testValue2'}]);
    });
  
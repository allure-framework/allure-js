import { afterEach, beforeEach } from "vitest";
import { bindAllureApi } from "./index.js";

beforeEach((ctx) => {
  // @ts-ignore
  global.allure = bindAllureApi(ctx.task);
});

afterEach(() => {
  // @ts-ignore
  global.allure = undefined;
});

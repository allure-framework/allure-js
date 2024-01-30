import { afterEach, beforeEach } from "vitest";
import { bindAllureApi } from "./index.js";

beforeEach((ctx) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ctx.task.meta.currentTest = {
    displayName: ctx.task.name || "root-test",
    labels: [],
    links: [],
    parameter: [],
    steps: [],
    attachments: [],
  };

  // @ts-ignore
  global.allure = bindAllureApi(ctx.task);
});

afterEach(() => {
  // @ts-ignore
  global.allure = undefined;
});

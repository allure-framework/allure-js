import type { Task } from "@vitest/runner";
import { LabelName } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { includedInTestPlan, parseTestPlan } from "allure-js-commons/sdk/reporter";

import { getTestMetadata } from "../utils.js";

declare module "vitest/browser" {
  interface BrowserCommands {
    existsInTestPlan(task: Task): Promise<boolean>;
  }
}

export const commands = {
  existsInTestPlan: (ctx: any, task: Task) => {
    if (!ctx.allureTestPlan) {
      ctx.allureTestPlan = parseTestPlan();
    }

    if (!ctx.allureTestPlan) {
      return true;
    }

    const { fullName, labels } = getTestMetadata(task);
    const { value: id } = labels.find(({ name }) => name === LabelName.ALLURE_ID) ?? {};

    return includedInTestPlan(ctx.allureTestPlan as TestPlanV1, { fullName, id });
  },
};

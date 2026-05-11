import { Status } from "allure-js-commons";

export const ALLURE_STEP_STATUS_ANNOTATION = "allure-js-commons:status";

export const isAllureStepStatus = (value: string | undefined): value is Status => {
  return typeof value === "string" && Object.values(Status).includes(value as Status);
};

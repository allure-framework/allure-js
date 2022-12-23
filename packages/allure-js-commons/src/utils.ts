import { createHash } from "crypto";
import { env } from "process";
import { AllureTest } from "./AllureTest";

export const md5 = (data: string) => createHash("md5").update(data).digest("hex");

export const attachLabelsFromEnv = (test: AllureTest) => {
  const envKeys = Object.keys(env);

  envKeys.forEach((key) => {
    const labelRegexp = /^ALLURE_LABEL_(?<labelName>.+)$/;
    const match = key.match(labelRegexp);
    if (match) {
      const labelName = match.groups?.labelName;
      const envValue = process.env[key];
      if (labelName && envValue) {
        test.addLabel(labelName.toLocaleLowerCase(), envValue);
      }
    }
  });
};

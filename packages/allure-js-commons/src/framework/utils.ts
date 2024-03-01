import { createHash, randomUUID } from "crypto";
import { Crypto, ExecutableItem, Status } from "../model";

export const crypto: Crypto = {
  uuid: () => {
    return randomUUID();
  },
  md5: (str: string) => {
    return createHash("md5").update(str).digest("hex");
  },
};

export const isAnyStepFailed = (item: ExecutableItem): boolean => {
  const isFailed = item.status === Status.FAILED;

  if (isFailed || item.steps.length === 0) {
    return isFailed;
  }

  return !!item.steps.find((step) => isAnyStepFailed(step));
};

export const isAllStepsEnded = (item: ExecutableItem): boolean => {
  return item.steps.every((val) => val.stop && isAllStepsEnded(val));
};

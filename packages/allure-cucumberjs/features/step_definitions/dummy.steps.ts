import assert from "assert";
import { Given, Then, When } from "cucumber";

export const delayPass = (ms: number): Promise<void> => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const delayFail = (ms: number): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => reject(new Error("Async error")), ms);
  });
};

When("do passing step", () => {});

When("do failing step", () => assert(false, "hello from failed step"));

When("do async passing step", () => delayPass(10));

When("do async failing step", () => delayFail(10));

When("do ambiguous step", () => {});

Then("do ambiguous step", () => {});

import { Given, Then, When } from "cucumber";
import assert from "assert";

export function delayPass(ms: number) {
  return new Promise<void>(function(resolve) {
    setTimeout(resolve, ms);
  });
}

export function delayFail(ms: number) {
  return new Promise<void>(function(resolve, reject) {
    setTimeout(() => reject(new Error("Async error")), ms);
  });
}

When("do passing step", () => {});

When("do failing step", () => assert(false, "hello from failed step"));

When("do async passing step", () => delayPass(10));

When("do async failing step", () => delayFail(10));

When("do ambiguous step", () => {});

Then("do ambiguous step", () => {});

import { AssertionError } from "node:assert";

import { expectTypeOf, it } from "vitest";

import { type ErrorDetails, type ErrorStatus, Status, type StatusDetails, globalError } from "../src/index.js";
import { MessageHolderTestRuntime, type SyncTestRuntime, type TestRuntime } from "../src/sdk/runtime/index.js";
import {
  type ErrorDetails as SyncErrorDetails,
  type ErrorStatus as SyncErrorStatus,
  globalError as globalErrorSync,
} from "../src/sync.js";

it("accepts details and raw assertion errors through public and runtime APIs", () => {
  const error = new AssertionError({ actual: 0, expected: false });
  const details: StatusDetails = { message: "mismatch", actual: "0", expected: "false" };
  const runtime = new MessageHolderTestRuntime();
  const asyncRuntime: TestRuntime = runtime;
  const syncRuntime: SyncTestRuntime = runtime.sync!;

  for (const report of [globalError, globalErrorSync, asyncRuntime.globalError, syncRuntime.globalError]) {
    report(details);
    report(error);
    report(Status.FAILED);
    report(Status.BROKEN, details);
    report(Status.FAILED, error);

    // @ts-expect-error Details may only be the first argument in a single-argument call.
    report(error, details);
    // @ts-expect-error Details may only be the first argument in a single-argument call.
    report(details, error);
    // @ts-expect-error Global errors cannot have a successful status.
    report(Status.PASSED);
    // @ts-expect-error Global errors cannot have a skipped status.
    report(Status.SKIPPED);
    // @ts-expect-error Status arguments use the shared enum.
    report("failed");
  }

  expectTypeOf<ErrorStatus>().toEqualTypeOf<Status.FAILED | Status.BROKEN>();
  expectTypeOf<SyncErrorStatus>().toEqualTypeOf<ErrorStatus>();
  expectTypeOf<ErrorDetails>().toEqualTypeOf<StatusDetails | Error>();
  expectTypeOf<SyncErrorDetails>().toEqualTypeOf<ErrorDetails>();
  expectTypeOf(globalError(details)).toEqualTypeOf<PromiseLike<void>>();
  expectTypeOf(globalErrorSync(details)).toEqualTypeOf<void>();
});

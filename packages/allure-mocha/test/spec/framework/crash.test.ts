import { Stage, Status } from "allure-js-commons";
import { describe, expect, test } from "vitest";

import { RUN_IN_PARALLEL, runMochaInlineTest } from "../../utils.js";

describe("process crash", () => {
  // In parallel mode mocha buffers a worker's results in memory and only forwards them
  // to the host process via IPC once the worker finishes normally. A worker that calls
  // process.exit() never gets to send that message, so the host loses everything the
  // worker collected — including tests that already passed. That's a limitation of
  // mocha's buffered-worker protocol itself, not something our crash recovery can fix.
  test.skipIf(RUN_IN_PARALLEL)(
    "the in-progress test is reported as broken when process.exit() is called outside mocha's control",
    async () => {
      const { tests } = await runMochaInlineTest("crash");

      expect(tests).toHaveLength(3);

      expect(tests.find((t) => t.name === "step one passes")).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests.find((t) => t.name === "step two passes")).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests.find((t) => t.name === "step three crashes the whole process")).toMatchObject({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: "Test runner crashed or exited unexpectedly",
        }),
      });

      // step four never got a chance to start — there must be no result for it
      expect(tests.find((t) => t.name === "step four never runs")).toBeUndefined();
    },
  );
});

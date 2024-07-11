/* eslint max-lines: 0 */
import { describe, expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils.js";

it("should support all types of hooks", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      beforeAll(() => {});
      afterAll(() => {});
      beforeEach(() => {});
      afterEach(() => {});

      it("foo", () => {});
    `,
  });

  const [{ uuid }] = tests;
  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});

it("should report root hooks for a test in another file", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/hooks.spec.js": `
      beforeAll(() => {});
      afterAll(() => {});
      beforeEach(() => {});
      afterEach(() => {});
    `,
    "spec/test/test.spec.js": `
      it("foo", () => {});
    `,
  });

  const [{ uuid }] = tests;
  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});

it("should report non-root hooks", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      describe("foo", () => {
        beforeAll(() => {});
        afterAll(() => {});
        beforeEach(() => {});
        afterEach(() => {});

        it("bar", () => {});
      })
    `,
  });

  const [{ uuid }] = tests;
  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});

it("should report one beforeEach/afterEach fixture per test", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      beforeEach(() => {});
      afterEach(() => {});

      it("foo", () => {});
      it("bar", () => {});
    `,
  });

  const [{ uuid: fooUuid }, { uuid: barUuid }] = tests;

  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeEach",
        children: [fooUuid],
        befores: [
          expect.objectContaining({
            name: "beforeEach",
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [fooUuid],
        befores: [],
        afters: [
          expect.objectContaining({
            name: "afterEach",
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [barUuid],
        befores: [
          expect.objectContaining({
            name: "beforeEach",
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [barUuid],
        befores: [],
        afters: [
          expect.objectContaining({
            name: "afterEach",
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
      }),
    ]),
  );
});

it("should report hooks for a test in a sub-suite", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      beforeAll(() => {});
      afterAll(() => {});
      beforeEach(() => {});
      afterEach(() => {});

      describe("foo", () => {
        it("bar", () => {});
      });
    `,
  });

  const [{ uuid }] = tests;
  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});

it("should not report hooks for a test in a parent-suite", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      describe("foo", () => {
        beforeAll(() => {});
        afterAll(() => {});
        beforeEach(() => {});
        afterEach(() => {});

        it("bar", () => {});
      });

      it("baz", () => {});
    `,
  });

  const bazUuid = tests.find((t) => t.name === "baz")?.uuid;
  expect(groups).not.toContainEqual(
    expect.objectContaining({
      children: expect.arrayContaining([bazUuid]),
    }),
  );
});

describe("timings", () => {
  it("should be consistent for sync hooks", async () => {
    const { tests, groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        const delay = () => {
          for (const now = Date.now(); now === Date.now();)
            ;
        };
        beforeAll(delay);
        afterAll(delay);
        beforeEach(delay);
        afterEach(delay);

        it("bar", delay);
      `,
    });

    const [{ start: testStart, stop: testStop }] = tests;
    const {
      befores: [{ start: beforeAllStart, stop: beforeAllStop }],
    } = groups.find((g) => g.name === "beforeAll")!;
    const {
      befores: [{ start: beforeEachStart, stop: beforeEachStop }],
    } = groups.find((g) => g.name === "beforeEach")!;
    const {
      afters: [{ start: afterAllStart, stop: afterAllStop }],
    } = groups.find((g) => g.name === "afterAll")!;
    const {
      afters: [{ start: afterEachStart, stop: afterEachStop }],
    } = groups.find((g) => g.name === "afterEach")!;
    const timiline = [
      beforeAllStart,
      beforeAllStop,
      testStart, // Jasmine calls beforeEach and afterEach between specStarted and specDone.
      beforeEachStart,
      beforeEachStop,
      afterEachStart,
      afterEachStop,
      testStop,
      afterAllStart,
      afterAllStop,
    ];
    expect([...timiline].sort()).toEqual(timiline);
  });

  it("should be consistent for async hooks", async () => {
    const { tests, groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        const wait = async () => await new Promise((r) => setTimeout(r, 1));
        beforeAll(wait);
        afterAll(wait);
        beforeEach(wait);
        afterEach(wait);

        it("bar", wait);
      `,
    });

    const [{ start: testStart, stop: testStop }] = tests;
    const {
      befores: [{ start: beforeAllStart, stop: beforeAllStop }],
    } = groups.find((g) => g.name === "beforeAll")!;
    const {
      befores: [{ start: beforeEachStart, stop: beforeEachStop }],
    } = groups.find((g) => g.name === "beforeEach")!;
    const {
      afters: [{ start: afterAllStart, stop: afterAllStop }],
    } = groups.find((g) => g.name === "afterAll")!;
    const {
      afters: [{ start: afterEachStart, stop: afterEachStop }],
    } = groups.find((g) => g.name === "afterEach")!;
    const timiline = [
      beforeAllStart,
      beforeAllStop,
      testStart,
      beforeEachStart,
      beforeEachStop,
      afterEachStart,
      afterEachStop,
      testStop,
      afterAllStart,
      afterAllStop,
    ];
    expect([...timiline].sort()).toEqual(timiline);
  });

  it("should be consistent for hooks with callbacks", async () => {
    const { tests, groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        const wait = (done) => setTimeout(done, 1);
        beforeAll(wait);
        afterAll(wait);
        beforeEach(wait);
        afterEach(wait);

        it("bar", wait);
      `,
    });

    const [{ start: testStart, stop: testStop }] = tests;
    const {
      befores: [{ start: beforeAllStart, stop: beforeAllStop }],
    } = groups.find((g) => g.name === "beforeAll")!;
    const {
      befores: [{ start: beforeEachStart, stop: beforeEachStop }],
    } = groups.find((g) => g.name === "beforeEach")!;
    const {
      afters: [{ start: afterAllStart, stop: afterAllStop }],
    } = groups.find((g) => g.name === "afterAll")!;
    const {
      afters: [{ start: afterEachStart, stop: afterEachStop }],
    } = groups.find((g) => g.name === "afterEach")!;
    const timiline = [
      beforeAllStart,
      beforeAllStop,
      testStart,
      beforeEachStart,
      beforeEachStop,
      afterEachStart,
      afterEachStop,
      testStop,
      afterAllStart,
      afterAllStop,
    ];
    expect([...timiline].sort()).toEqual(timiline);
  });
});

describe("hook failures", () => {
  it("reports failed sync hook", async () => {
    const { tests, groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        beforeAll(() => {
          throw new Error("foo");
        });

        it("bar", () => {});
      `,
    });

    expect(tests, "has broken test").toEqual([
      expect.objectContaining({
        name: "bar",
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Not run because a beforeAll function failed"),
          trace: expect.anything(),
        }),
      }),
    ]);
    expect(groups, "has broken fixture").toEqual([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            name: "beforeAll",
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: expect.stringContaining("foo"),
              trace: expect.stringContaining("sample.spec.js"),
            }),
          }),
        ],
        children: [tests[0].uuid],
      }),
    ]);
  });

  it("reports failed async hook", async () => {
    const { tests, groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        beforeAll(async () => {
          throw new Error("foo");
        });

        it("bar", () => {});
      `,
    });

    expect(tests, "has broken test").toEqual([
      expect.objectContaining({
        name: "bar",
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Not run because a beforeAll function failed"),
          trace: expect.anything(),
        }),
      }),
    ]);
    expect(groups, "has broken fixture").toEqual([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            name: "beforeAll",
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: expect.stringContaining("foo"),
              trace: expect.stringContaining("sample.spec.js"),
            }),
          }),
        ],
        children: [tests[0].uuid],
      }),
    ]);
  });

  describe("callback hooks", () => {
    it("should report an unhandled exception", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            throw new Error("foo");
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          }),
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("foo"),
                trace: expect.stringContaining("sample.spec.js"),
              }),
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });

    it("should report error when done.fail is called with Error", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            done.fail(new Error("foo"));
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          }),
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("foo"),
                trace: expect.stringContaining("sample.spec.js"),
              }),
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });

    it("should report error when done.fail is called with string", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            done.fail("foo");
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: {
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          },
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: {
                message: "foo",
              },
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });

    it("should report error when done.fail is called with no args", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            done.fail();
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: {
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          },
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: {
                message: "done.fail was called",
              },
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });

    it("should report done with Error", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            done(new Error("foo"));
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: {
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          },
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("foo"),
                trace: expect.stringContaining("sample.spec.js"),
              }),
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });

    it("should report done with string", async () => {
      const { tests, groups } = await runJasmineInlineTest({
        "spec/test/sample.spec.js": `
          beforeAll((done) => {
            done("foo");
          });

          it("bar", () => {});
        `,
      });

      expect(tests, "has broken test").toEqual([
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          statusDetails: {
            message: expect.stringContaining("Not run because a beforeAll function failed"),
            trace: expect.anything(),
          },
        }),
      ]);
      expect(groups, "has broken fixture").toEqual([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              status: Status.BROKEN,
              statusDetails: {
                message: "foo",
              },
            }),
          ],
          children: [tests[0].uuid],
        }),
      ]);
    });
  });
});

it("should keep the context", async () => {
  const {
    tests: [test],
    groups,
  } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      beforeAll(function () {
        this.state = ["beforeAll"];
      });
      beforeEach(function () {
        this.state.push("beforeEach");
      });
      afterEach(function () {
        this.state.push("afterEach");
      });
      afterAll(function () {
        this.state.push("afterAll");
        expect(this.state).toEqual([
          "beforeAll",
          "beforeEach",
          "it",
          "afterEach",
          "afterAll",
        ]);
      });

      it("foo", function () {
        this.state.push("it");
      });
    `,
  });

  expect(test).toMatchObject({ status: Status.PASSED });
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [expect.objectContaining({ name: "beforeAll", status: Status.PASSED })],
      }),
      expect.objectContaining({
        befores: [expect.objectContaining({ name: "beforeEach", status: Status.PASSED })],
      }),
      expect.objectContaining({
        afters: [expect.objectContaining({ name: "afterAll", status: Status.PASSED })],
      }),
      expect.objectContaining({
        afters: [expect.objectContaining({ name: "afterEach", status: Status.PASSED })],
      }),
    ]),
  );
});

describe("hook steps", () => {
  it("supports steps in async hooks", async () => {
    const { groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        const { step } = require("allure-js-commons");

        const wait = async () => await new Promise((r) => setTimeout(r, 1));
        beforeAll(async () => {
          await step("step in beforeAll", wait);
        });
        afterAll(async () => {
          await step("step in afterAll", wait);
        });
        beforeEach(async () => {
          await step("step in beforeEach", wait);
        });
        afterEach(async () => {
          await step("step in afterEach", wait);
        });

        it("foo", wait);
      `,
    });

    expect(groups).toHaveLength(4);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              steps: [
                expect.objectContaining({
                  name: "step in beforeAll",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          name: "afterAll",
          afters: [
            expect.objectContaining({
              steps: [
                expect.objectContaining({
                  name: "step in afterAll",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeEach",
              steps: [
                expect.objectContaining({
                  name: "step in beforeEach",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          name: "afterEach",
          afters: [
            expect.objectContaining({
              steps: [
                expect.objectContaining({
                  name: "step in afterEach",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
      ]),
    );
  });

  it("supports steps in hooks with callbacks", async () => {
    const { groups } = await runJasmineInlineTest({
      "spec/test/sample.spec.js": `
        const { step } = require("allure-js-commons");

        beforeAll((done) => {
          step("step in beforeAll", () => {}).finally(done);
        });
        afterAll((done) => {
          step("step in afterAll", () => {}).finally(done);
        });
        beforeEach((done) => {
          step("step in beforeEach", () => {}).finally(done);
        });
        afterEach((done) => {
          step("step in afterEach", () => {}).finally(done);
        });

        it("foo", () => {});
      `,
    });

    expect(groups).toHaveLength(4);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeAll",
              steps: [
                expect.objectContaining({
                  name: "step in beforeAll",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          name: "afterAll",
          afters: [
            expect.objectContaining({
              steps: [
                expect.objectContaining({
                  name: "step in afterAll",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          befores: [
            expect.objectContaining({
              name: "beforeEach",
              steps: [
                expect.objectContaining({
                  name: "step in beforeEach",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          name: "afterEach",
          afters: [
            expect.objectContaining({
              steps: [
                expect.objectContaining({
                  name: "step in afterEach",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                }),
              ],
            }),
          ],
        }),
      ]),
    );
  });
});

it("should support attachments in hooks", async () => {
  const { groups, attachments } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { attachment } = require("allure-js-commons");

      beforeAll(async () => {
        await attachment("foo", "beforeAll", "text/plain");
      });
      afterAll(async () => {
        await attachment("bar", "afterAll", "text/plain");
      });
      beforeEach(async () => {
        await attachment("baz", "beforeEach", "text/plain");
      });
      afterEach(async () => {
        await attachment("qux", "afterEach", "text/plain");
      });

      it("quz", () => {});
    `,
  });

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            name: "beforeAll",
            steps: [
              expect.objectContaining({
                name: "foo",
                attachments: [expect.objectContaining({ name: "foo", type: "text/plain" })],
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        afters: [
          expect.objectContaining({
            name: "afterAll",
            steps: [
              expect.objectContaining({
                name: "bar",
                attachments: [expect.objectContaining({ name: "bar", type: "text/plain" })],
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            name: "beforeEach",
            steps: [
              expect.objectContaining({
                name: "baz",
                attachments: [expect.objectContaining({ name: "baz", type: "text/plain" })],
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        afters: [
          expect.objectContaining({
            name: "afterEach",
            steps: [
              expect.objectContaining({
                name: "qux",
                attachments: [expect.objectContaining({ name: "qux", type: "text/plain" })],
              }),
            ],
          }),
        ],
      }),
    ]),
  );

  const {
    befores: [
      {
        steps: [
          {
            attachments: [{ source: beforeAllAttachment }],
          },
        ],
      },
    ],
  } = groups.find((g) => g.name === "beforeAll")!;
  const {
    afters: [
      {
        steps: [
          {
            attachments: [{ source: afterAllAttachment }],
          },
        ],
      },
    ],
  } = groups.find((g) => g.name === "afterAll")!;
  const {
    befores: [
      {
        steps: [
          {
            attachments: [{ source: beforeEachAttachment }],
          },
        ],
      },
    ],
  } = groups.find((g) => g.name === "beforeEach")!;
  const {
    afters: [
      {
        steps: [
          {
            attachments: [{ source: afterEachAttachment }],
          },
        ],
      },
    ],
  } = groups.find((g) => g.name === "afterEach")!;

  expect(Buffer.from(attachments[beforeAllAttachment] as string, "base64").toString("utf8")).toEqual("beforeAll");
  expect(Buffer.from(attachments[afterAllAttachment] as string, "base64").toString("utf8")).toEqual("afterAll");
  expect(Buffer.from(attachments[beforeEachAttachment] as string, "base64").toString("utf8")).toEqual("beforeEach");
  expect(Buffer.from(attachments[afterEachAttachment] as string, "base64").toString("utf8")).toEqual("afterEach");
});

it("should support hook renaming", async () => {
  const { groups } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { displayName } = require("allure-js-commons");

      beforeAll(async () => {
        await displayName("foo");
      });
      afterAll(async () => {
        await displayName("bar");
      });
      beforeEach(async () => {
        await displayName("baz");
      });
      afterEach(async () => {
        await displayName("qux");
      });

      it("quz", () => {});
    `,
  });

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [expect.objectContaining({ name: "foo" })],
      }),
      expect.objectContaining({
        afters: [expect.objectContaining({ name: "bar" })],
      }),
      expect.objectContaining({
        befores: [expect.objectContaining({ name: "baz" })],
      }),
      expect.objectContaining({
        afters: [expect.objectContaining({ name: "qux" })],
      }),
    ]),
  );
});

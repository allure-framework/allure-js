/* eslint max-lines: 0 */
import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { Stage, Status, issue } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("should create steps from cypress commands", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("foo", () => {
      cy.log(1);
      cy.wrap(1);
      cy.wrap("foo", { log: false }); // this one must be ignored
      cy.wrap("bar").should("eq", "bar").and("not.eq", "baz"); // assertion steps are grouped under the "wrap"
      cy.wrap("baz", { log: false }).should("eq", "baz").and("not.eq", "bar"); // assertion steps are hoisted
    });
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "foo",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "log 1",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [
            {
              name: "message",
              value: "1",
            },
          ],
          steps: [],
        }),
        expect.objectContaining({
          name: "wrap 1",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [
            {
              name: "Yielded",
              value: "1",
            },
          ],
          steps: [],
        }),
        expect.objectContaining({
          name: "wrap bar",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [
            {
              name: "Yielded",
              value: "bar",
            },
          ],
          steps: [
            expect.objectContaining({
              name: "assert expected bar to equal bar",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              parameters: [
                {
                  name: "actual",
                  value: "bar",
                },
                {
                  name: "expected",
                  value: "bar",
                },
              ],
              steps: [],
            }),
            expect.objectContaining({
              name: "assert expected bar to not equal baz",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              parameters: [
                {
                  name: "actual",
                  value: "bar",
                },
                {
                  name: "expected",
                  value: "baz",
                },
              ],
              steps: [],
            }),
          ],
        }),
        expect.objectContaining({
          name: "assert expected baz to equal baz",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [
            {
              name: "actual",
              value: "baz",
            },
            {
              name: "expected",
              value: "baz",
            },
          ],
          steps: [],
        }),
        expect.objectContaining({
          name: "assert expected baz to not equal bar",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [
            {
              name: "actual",
              value: "baz",
            },
            {
              name: "expected",
              value: "bar",
            },
          ],
          steps: [],
        }),
      ],
    }),
  ]);
});

describe("parameter serialization", () => {
  it("should convert parameter values to JSON strings", async () => {
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
      it("foo", () => {
        cy.log(1);
        cy.log("1");
        cy.log([1, 2, 3]);
        cy.log({ foo: 1, bar: 2, baz: 3 });
      });
    `,
    });

    expect(tests).toEqual([
      expect.objectContaining({
        name: "foo",
        status: Status.PASSED,
        steps: [
          expect.objectContaining({
            name: "log 1",
            parameters: [
              {
                name: "message",
                value: "1",
              },
            ],
          }),
          expect.objectContaining({
            name: "log 1",
            parameters: [
              {
                name: "message",
                value: "1",
              },
            ],
          }),
          expect.objectContaining({
            name: "log [1, 2, 3]",
            parameters: [
              {
                name: "message",
                value: "[1,2,3]",
              },
            ],
          }),
          expect.objectContaining({
            name: "log Object{3}",
            parameters: [
              {
                name: "message",
                value: String.raw`{"foo":1,"bar":2,"baz":3}`,
              },
            ],
          }),
        ],
      }),
    ]);
  });

  it("should impose limits on command arguments", async () => {
    issue("1070");
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {
          const obj1 = {};
          obj1.ref = obj1; // should remove a direct circular reference 'ref'
          cy.wrap(obj1);

          const sibling = {};
          cy.wrap({ ref: { foo: sibling, bar: sibling } }); // it's okay to have the same object on different paths

          const obj2 = { ref: {} };
          obj2.ref.ref = obj2;
          cy.wrap(obj2); // should remove an indirect circular reference 'ref.ref'

          cy.wrap("A".repeat(1000)); // should truncate string values
          cy.wrap(Array(1000).fill("A")); // should truncate objects
          cy.wrap({ foo: { bar: { baz: {}, qux: "qut" } } }) // should remove 'baz' because it creates nesting level 4
        });
      `,
    });

    expect(tests).toEqual([
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: JSON.stringify({}),
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: JSON.stringify({ ref: { foo: {}, bar: {} } }),
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: JSON.stringify({ ref: {} }),
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: `${"A".repeat(128)}...`,
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: `[${String.raw`"A",`.repeat(31)}"A"...`,
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: JSON.stringify({ foo: { bar: { qux: "qut" } } }),
              },
            ],
          }),
        ],
      }),
    ]);
  });

  it("should take the limits from the config", async () => {
    issue("1070");
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {
          cy.wrap("A".repeat(100)); // should truncate string values
          cy.wrap(Array(100).fill("A")); // should truncate objects
          cy.wrap({ foo: { bar: { }, baz: "qux" } }) // should remove 'bar' that creates nesting level 3 but keep 'baz'
        });
      `,
      "cypress.config.js": ({ allureCypressReporterModulePath }) => `
        const { allureCypress } = require("${allureCypressReporterModulePath}");

        module.exports = {
          e2e: {
            baseUrl: "https://allurereport.org",
            viewportWidth: 1240,
            setupNodeEvents: (on, config) => {
              allureCypress(on, config, {
                stepsFromCommands: {
                  maxArgumentLength: 25,
                  maxArgumentDepth: 2,
                }
              });

              return config;
            },
          },
        };
      `,
    });

    expect(tests).toEqual([
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: `${"A".repeat(25)}...`,
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: `[${String.raw`"A",`.repeat(6)}...`,
              },
            ],
          }),
          expect.objectContaining({
            parameters: [
              {
                name: "Yielded",
                value: JSON.stringify({ foo: { baz: "qux" } }),
              },
            ],
          }),
        ],
      }),
    ]);
  });
});

it("should create steps from log groups", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("foo", () => {
      const log = Cypress.log({
        name: "bar",
        message: "baz",
        groupStart: true,
        type: "parent",
      });
      log.endGroup();
    });
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "bar baz",
          status: Status.PASSED,
          parameters: [],
        }),
      ],
    }),
  ]);
});

it("should nest command steps in log group steps", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("foo", () => {
      const log = Cypress.log({
        name: "bar",
        message: "baz",
        groupStart: true,
        type: "parent",
      });
      cy.log("qux");
      cy.wrap("qut").should("eq", "qut").and("not.eq", "qat").then(() => {
        log.endGroup();
      });
    });
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "bar baz",
          status: Status.PASSED,
          parameters: [],
          steps: [
            expect.objectContaining({
              name: "log qux",
              status: Status.PASSED,
              parameters: [
                {
                  name: "message",
                  value: "qux",
                },
              ],
            }),
            expect.objectContaining({
              name: "wrap qut",
              status: Status.PASSED,
              parameters: [
                {
                  name: "Yielded",
                  value: "qut",
                },
              ],
              steps: [
                expect.objectContaining({
                  name: "assert expected qut to equal qut",
                  status: Status.PASSED,
                  parameters: [
                    {
                      name: "actual",
                      value: "qut",
                    },
                    {
                      name: "expected",
                      value: "qut",
                    },
                  ],
                }),
                expect.objectContaining({
                  name: "assert expected qut to not equal qat",
                  status: Status.PASSED,
                  parameters: [
                    {
                      name: "actual",
                      value: "qut",
                    },
                    {
                      name: "expected",
                      value: "qat",
                    },
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]);
});

describe("mixed steps", () => {
  let test: TestResult;

  beforeAll(async () => {
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      import { step } from "${allureCommonsModulePath}";
      it("foo", () => {
        const log = Cypress.log({
          name: "bar",
          message: "baz",
          groupStart: true,
          type: "parent",
        });
        cy.then(() => new Cypress.Promise((r) => setTimeout(r, 1)));
        cy.log("qux");
        cy.then(() => new Cypress.Promise((r) => setTimeout(r, 1)));
        cy.wrap("qut").should((r) => new Cypress.Promise((resolve) => setTimeout(() => resolve(r), 1)).then((r) => {
          expect(r).eq("qut");
        })).and((r) => new Cypress.Promise((resolve) => setTimeout(() => resolve(r), 1)).then((r) => {
          expect(r).not.eq("qat");
        }));
        cy.then(() => new Cypress.Promise((r) => setTimeout(r, 1)));
        step("ztu", () => new Cypress.Promise((r) => setTimeout(r, 1))).then(() => {
          log.endGroup();
        });
      });
    `,
    });

    test = tests[0];
  });

  it("should stop command log steps and keep groups before starting a lambda step", () => {
    expect(test).toEqual(
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        steps: [
          expect.objectContaining({
            name: "bar baz",
            status: Status.PASSED,
            parameters: [],
            steps: [
              expect.objectContaining({
                name: "log qux",
                status: Status.PASSED,
                parameters: [
                  {
                    name: "message",
                    value: "qux",
                  },
                ],
              }),
              expect.objectContaining({
                name: "wrap qut",
                status: Status.PASSED,
                parameters: [
                  {
                    name: "Yielded",
                    value: "qut",
                  },
                ],
                steps: [
                  expect.objectContaining({
                    name: "assert expected qut to equal qut",
                    status: Status.PASSED,
                    parameters: [
                      {
                        name: "actual",
                        value: "qut",
                      },
                      {
                        name: "expected",
                        value: "qut",
                      },
                    ],
                  }),
                  expect.objectContaining({
                    name: "assert expected qut to not equal qat",
                    status: Status.PASSED,
                    parameters: [
                      {
                        name: "actual",
                        value: "qut",
                      },
                      {
                        name: "expected",
                        value: "qat",
                      },
                    ],
                  }),
                ],
              }),
              expect.objectContaining({
                name: "ztu",
                status: Status.PASSED,
                parameters: [],
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("should keep the timings consistent", () => {
    const {
      start: testStart,
      stop: testStop,
      steps: [
        {
          start: logGroupStart,
          stop: logGroupStop,
          steps: [
            { start: logStart, stop: logStop },
            {
              start: wrapStart,
              stop: wrapStop,
              steps: [{ start: assertEqStart, stop: assertEqStop }, { start: assertNeqStart, stop: assertNeqStop }],
            },
            { start: apiStepStart, stop: apiStepStop },
          ],
        },
      ],
    } = test;

    const expectedOrder = [
      testStart,
      logGroupStart,
      logStart,
      logStop,
      wrapStart,
      assertEqStart,
      assertEqStop,
      assertNeqStart,
      assertNeqStop,
      wrapStop,
      apiStepStart,
      apiStepStop,
      logGroupStop,
      testStop,
    ];
    const actualOrder = [...expectedOrder].sort();

    expect(actualOrder).toEqual(expectedOrder);
  });
});

describe("failed and broken tests with mixed steps", () => {
  let failedTest: TestResult;
  let brokenTest: TestResult;

  beforeAll(async () => {
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      import { step } from "${allureCommonsModulePath}";
      it("failed test", () => {
        step("api step 1", () => {
          const log = Cypress.log({
            name: "log",
            message: "group step 1",
            groupStart: true,
            type: "parent",
          });
          step("api step 2", () => {
            cy.log("foo");
            cy.wrap("bar", { timeout: 0 }).should("eq", "baz").and("not.eq", "baz");
          }).then(() => {
            log.endGroup();
          });
        });
      });

      it("broken test", () => {
        step("api step 1", () => {
          const log = Cypress.log({
            name: "log",
            message: "group step 1",
            groupStart: true,
            type: "parent",
          });
          step("api step 2", () => {
            cy.log("foo");
            cy.wrap("bar").should("eq", "bar").then(() => {
              return step("api step 3", () => {
                throw new Error("baz");
              });
            });
          }).then(() => {
            log.endGroup();
          });
        });
      });
    `,
    });

    failedTest = tests.find((t) => t.name === "failed test")!;
    brokenTest = tests.find((t) => t.name === "broken test")!;
  });

  it("should stop all steps with correct statuses", () => {
    expect(failedTest).toMatchObject({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "api step 1",
          status: Status.FAILED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("expected 'bar' to equal 'baz'"),
            trace: expect.stringContaining("sample.cy.js"),
          }),
          parameters: [],
          steps: [
            expect.objectContaining({
              name: "log group step 1",
              status: Status.FAILED,
              stage: Stage.FINISHED,
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("expected 'bar' to equal 'baz'"),
                trace: expect.stringContaining("sample.cy.js"),
              }),
              parameters: [],
              steps: [
                expect.objectContaining({
                  name: "api step 2",
                  status: Status.FAILED,
                  stage: Stage.FINISHED,
                  parameters: [],
                  steps: [
                    expect.objectContaining({
                      name: "log foo",
                      status: Status.PASSED,
                      stage: Stage.FINISHED,
                      parameters: [
                        {
                          name: "message",
                          value: "foo",
                        },
                      ],
                      steps: [],
                    }),
                    expect.objectContaining({
                      name: "wrap bar",
                      status: Status.FAILED,
                      stage: Stage.FINISHED,
                      statusDetails: expect.objectContaining({
                        message: expect.stringContaining("expected 'bar' to equal 'baz'"),
                        trace: expect.stringContaining("sample.cy.js"),
                      }),
                      parameters: [],
                      steps: [
                        expect.objectContaining({
                          name: "assert expected bar to equal baz",
                          status: Status.FAILED,
                          stage: Stage.FINISHED,
                          statusDetails: expect.objectContaining({
                            message: expect.stringContaining("expected 'bar' to equal 'baz'"),
                            trace: expect.stringContaining("sample.cy.js"),
                          }),
                          parameters: [
                            {
                              name: "actual",
                              value: "bar",
                            },
                            {
                              name: "expected",
                              value: "baz",
                            },
                          ],
                          steps: [],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(brokenTest).toMatchObject({
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "api step 1",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "baz",
            trace: expect.stringContaining("sample.cy.js"),
          }),
          steps: [
            expect.objectContaining({
              name: "log group step 1",
              status: Status.BROKEN,
              stage: Stage.FINISHED,
              statusDetails: expect.objectContaining({
                message: "baz",
                trace: expect.stringContaining("sample.cy.js"),
              }),
              parameters: [],
              steps: [
                expect.objectContaining({
                  name: "api step 2",
                  status: Status.BROKEN,
                  stage: Stage.FINISHED,
                  statusDetails: expect.objectContaining({
                    message: "baz",
                    trace: expect.stringContaining("sample.cy.js"),
                  }),
                  parameters: [],
                  steps: [
                    expect.objectContaining({
                      name: "log foo",
                      status: Status.PASSED,
                      stage: Stage.FINISHED,
                      parameters: [
                        {
                          name: "message",
                          value: "foo",
                        },
                      ],
                    }),
                    expect.objectContaining({
                      name: "wrap bar",
                      status: Status.PASSED,
                      stage: Stage.FINISHED,
                      parameters: [
                        {
                          name: "Yielded",
                          value: "bar",
                        },
                      ],
                      steps: [
                        expect.objectContaining({
                          name: "assert expected bar to equal bar",
                          status: Status.PASSED,
                          stage: Stage.FINISHED,
                          parameters: [
                            {
                              name: "actual",
                              value: "bar",
                            },
                            {
                              name: "expected",
                              value: "bar",
                            },
                          ],
                        }),
                      ],
                    }),
                    expect.objectContaining({
                      name: "api step 3",
                      status: Status.BROKEN,
                      stage: Stage.FINISHED,
                      statusDetails: expect.objectContaining({
                        message: "baz",
                        trace: expect.stringContaining("sample.cy.js"),
                      }),
                      parameters: [],
                      steps: [],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  it("should keep the timings consistent", () => {
    const {
      start: testStartFailed,
      stop: testStopFailed,
      steps: [
        {
          start: apiStep1StartFailed,
          stop: apiStep1StopFailed,
          steps: [
            {
              start: logGroupStartFailed,
              stop: logGroupStopFailed,
              steps: [
                {
                  start: apiStep2StartFailed,
                  stop: apiStep2StopFailed,
                  steps: [
                    { start: logStartFailed, stop: logStopFailed },
                    {
                      start: wrapStartFailed,
                      stop: wrapStopFailed,
                      steps: [{ start: assertStartFailed, stop: assertStopFailed }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } = failedTest;
    const {
      start: testStartBroken,
      stop: testStopBroken,
      steps: [
        {
          start: apiStep1StartBroken,
          stop: apiStep1StopBroken,
          steps: [
            {
              start: logGroupStartBroken,
              stop: logGroupStopBroken,
              steps: [
                {
                  start: apiStep2StartBroken,
                  stop: apiStep2StopBroken,
                  steps: [
                    { start: logStartBroken, stop: logStopBroken },
                    {
                      start: wrapStartBroken,
                      stop: wrapStopBroken,
                      steps: [{ start: assertStartBroken, stop: assertStopBroken }],
                    },
                    { start: apiStep3StartBroken, stop: apiStep3StopBroken },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } = brokenTest;

    const expectedOrder = [
      testStartFailed,
      apiStep1StartFailed,
      logGroupStartFailed,
      apiStep2StartFailed,
      logStartFailed,
      logStopFailed,
      wrapStartFailed,
      assertStartFailed,
      assertStopFailed,
      wrapStopFailed,
      apiStep2StopFailed,
      logGroupStopFailed,
      apiStep1StopFailed,
      testStopFailed,
      testStartBroken,
      apiStep1StartBroken,
      logGroupStartBroken,
      apiStep2StartBroken,
      logStartBroken,
      logStopBroken,
      wrapStartBroken,
      assertStartBroken,
      assertStopBroken,
      wrapStopBroken,
      apiStep3StartBroken,
      apiStep3StopBroken,
      apiStep2StopBroken,
      logGroupStopBroken,
      apiStep1StopBroken,
      testStopBroken,
    ];
    const actualOrder = [...expectedOrder].sort();

    expect(actualOrder).toEqual(expectedOrder);
  });
});

it("should support commands in hooks", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    beforeEach(() => {
      const log = Cypress.log({
        name: "log",
        message: "step",
        groupStart: true,
        type: "parent",
      });
      cy.log("foo");
      cy.wrap("bar").should("eq", "bar").and("not.eq", "baz").then(() => {
        log.endGroup();
      });
      cy.log("qux");
    });

    it("qut", () => {});
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "qut",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [],
    }),
  ]);
  expect(groups).toEqual([
    expect.objectContaining({
      children: [tests[0].uuid],
      befores: [
        expect.objectContaining({
          name: String.raw`"before each" hook`,
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({
              name: "log step",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              parameters: [],
              steps: [
                expect.objectContaining({
                  name: "log foo",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                  parameters: [{ name: "message", value: "foo" }],
                  steps: [],
                }),
                expect.objectContaining({
                  name: "wrap bar",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                  parameters: [{ name: "Yielded", value: "bar" }],
                  steps: [
                    expect.objectContaining({
                      name: "assert expected bar to equal bar",
                      status: Status.PASSED,
                      stage: Stage.FINISHED,
                      parameters: [
                        { name: "actual", value: "bar" },
                        { name: "expected", value: "bar" },
                      ],
                      steps: [],
                    }),
                    expect.objectContaining({
                      name: "assert expected bar to not equal baz",
                      status: Status.PASSED,
                      stage: Stage.FINISHED,
                      parameters: [
                        { name: "actual", value: "bar" },
                        { name: "expected", value: "baz" },
                      ],
                      steps: [],
                    }),
                  ],
                }),
              ],
            }),
            expect.objectContaining({
              name: "log qux",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              steps: [],
              parameters: [{ name: "message", value: "qux" }],
            }),
          ],
        }),
      ],
    }),
  ]);
});

it("should renderProps works correct", async () => {
  issue("1280");
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
        it("use origin", () => {
        cy.origin("https://github.com", () => {
          cy.log("foo");})
        });
      `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "use origin",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "origin https://github.com",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({
              name: "log foo",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              parameters: [
                {
                  name: "message",
                  value: "foo",
                },
              ],
              steps: [],
            }),
          ],
        }),
      ],
    }),
  ]);
});

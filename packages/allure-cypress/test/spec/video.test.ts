import { describe, expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

describe("write video for every test", () => {
  it("attaches same video to each test in a spec", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {});

        it("bar", () => {});
      `,
      "cypress.config.js": () =>
        `
      const { allureCypress } = require("allure-cypress/reporter");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          video: true,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
              links: [
                {
                  type: "issue",
                  urlTemplate: "https://allurereport.org/issues/%s"
                },
                {
                  type: "tms",
                  urlTemplate: "https://allurereport.org/tasks/%s"
                },
              ]
            });

            return config;
          },
        },
      };
    `,
    });

    expect(tests).toHaveLength(2);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        name: "Cypress video",
        children: expect.arrayContaining([tests[0].uuid, tests[1].uuid]),
        afters: [
          expect.objectContaining({
            name: "Cypress video",
            attachments: [
              expect.objectContaining({
                name: "Cypress video",
                type: ContentType.MP4,
              }),
            ],
          }),
        ],
      }),
    );
  });
});

describe("write video for failed tests only", () => {
  it("doesn't attach video for passed tests", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {});
      `,
      "cypress.config.js": () =>
        `
          const { allureCypress } = require("allure-cypress/reporter");

          module.exports = {
            e2e: {
              baseUrl: "https://allurereport.org",
              viewportWidth: 1240,
              video: true,
              setupNodeEvents: (on, config) => {
                allureCypress(on, {
                  videoOnFailOnly: true,
                  links: [
                    {
                      type: "issue",
                      urlTemplate: "https://allurereport.org/issues/%s"
                    },
                    {
                      type: "tms",
                      urlTemplate: "https://allurereport.org/tasks/%s"
                    },
                  ]
                });

                return config;
              },
            },
          };
        `,
    });

    expect(tests).toHaveLength(1);
    expect(groups).toHaveLength(0);
  });

  it("attaches video for failed tests", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {
          cy.wrap(1).eq(2);
        });
      `,
      "cypress.config.js": () =>
        `
          const { allureCypress } = require("allure-cypress/reporter");

          module.exports = {
            e2e: {
              baseUrl: "https://allurereport.org",
              viewportWidth: 1240,
              video: true,
              testTimeout: 500,
              setupNodeEvents: (on, config) => {
                allureCypress(on, {
                  videoOnFailOnly: true,
                  links: [
                    {
                      type: "issue",
                      urlTemplate: "https://allurereport.org/issues/%s"
                    },
                    {
                      type: "tms",
                      urlTemplate: "https://allurereport.org/tasks/%s"
                    },
                  ]
                });

                return config;
              },
            },
          };
        `,
    });

    expect(tests).toHaveLength(1);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        name: "Cypress video",
        children: expect.arrayContaining([tests[0].uuid]),
        afters: [
          expect.objectContaining({
            name: "Cypress video",
            attachments: [
              expect.objectContaining({
                name: "Cypress video",
                type: ContentType.MP4,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("attaches video for broken tests", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {
          throw new Error("foo");
        });
      `,
      "cypress.config.js": () =>
        `
          const { allureCypress } = require("allure-cypress/reporter");

          module.exports = {
            e2e: {
              baseUrl: "https://allurereport.org",
              viewportWidth: 1240,
              video: true,
              testTimeout: 500,
              setupNodeEvents: (on, config) => {
                allureCypress(on, {
                  videoOnFailOnly: true,
                  links: [
                    {
                      type: "issue",
                      urlTemplate: "https://allurereport.org/issues/%s"
                    },
                    {
                      type: "tms",
                      urlTemplate: "https://allurereport.org/tasks/%s"
                    },
                  ]
                });

                return config;
              },
            },
          };
        `,
    });

    expect(tests).toHaveLength(1);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        name: "Cypress video",
        children: expect.arrayContaining([tests[0].uuid]),
        afters: [
          expect.objectContaining({
            name: "Cypress video",
            attachments: [
              expect.objectContaining({
                name: "Cypress video",
                type: ContentType.MP4,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("attaches video for all tests in failed file", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {
          cy.wrap(1).eq(1);
        });

        it("bar", () => {
          cy.wrap(1).eq(2);
        });
      `,
      "cypress.config.js": () =>
        `
          const { allureCypress } = require("allure-cypress/reporter");

          module.exports = {
            e2e: {
              baseUrl: "https://allurereport.org",
              viewportWidth: 1240,
              video: true,
              testTimeout: 500,
              setupNodeEvents: (on, config) => {
                allureCypress(on, {
                  videoOnFailOnly: true,
                  links: [
                    {
                      type: "issue",
                      urlTemplate: "https://allurereport.org/issues/%s"
                    },
                    {
                      type: "tms",
                      urlTemplate: "https://allurereport.org/tasks/%s"
                    },
                  ]
                });

                return config;
              },
            },
          };
        `,
    });

    expect(tests).toHaveLength(2);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        name: "Cypress video",
        children: expect.arrayContaining([tests[0].uuid, tests[1].uuid]),
        afters: [
          expect.objectContaining({
            name: "Cypress video",
            attachments: [
              expect.objectContaining({
                name: "Cypress video",
                type: ContentType.MP4,
              }),
            ],
          }),
        ],
      }),
    );
  });
});

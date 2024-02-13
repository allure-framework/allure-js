const { readFileSync, rmSync, existsSync } = require("node:fs");
const { join, relative } = require("node:path");
const { globSync } = require("glob");
const { allureCypress } = require("./dist/reporter");

module.exports = {
  experimentalInteractiveRunEvents: true,
  e2e: {
    baseUrl: "https://allurereport.org",
    viewportWidth: 1240,
    video: false,
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

      on("task", {
        readLastTestResult: () => {
          const result = {
            tests: [],
            groups: [],
            attachments: {},
          };
          const rawTests = globSync([join(__dirname, "./allure-results/*-result.json")]);
          const rawGroups = globSync([join(__dirname, "./allure-results/*-container.json")]);
          const attachments = globSync([join(__dirname, "./allure-results/*-attachment.*")]);
          const specFiles = [].concat(rawTests, rawGroups, attachments);
          const tests = rawTests.map((item) => {
            const test = readFileSync(item, "utf8");

            return JSON.parse(test);
          });
          const groups = rawGroups.map((item) => {
            const group = readFileSync(item, "utf8");

            return JSON.parse(group);
          });

          tests.forEach((item) => {
            result.tests.push(item);
          });
          groups.forEach((item) => {
            result.groups.push(item);
          });
          attachments.forEach((item) => {
            const attachmentPath = relative(join(__dirname, "./allure-results"), item);
            const attachmentContent = readFileSync(item, "base64");

            result.attachments[attachmentPath] = attachmentContent;
          });


          specFiles.forEach((item) => {
            rmSync(item);
          });

          return result;
        },
      });

      return config;
    },
  },
};

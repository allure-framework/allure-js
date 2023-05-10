import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  reporter: [
    [
      require.resolve("../dist/index.js"),
      {
        outputFolder: "./out/allure-results",
      },
    ],
    ["dot"],
  ],

  projects: [
    {
      name: "project",
    },
  ],
};

// eslint-disable-next-line import/no-default-export
export default config;

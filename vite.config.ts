import { env } from "node:process";

import { defineConfig } from "vite-plus";

const buildTestTask = () => {
  const packages = env.TEST_PACKAGES?.split(",") ?? [];
  const filtersFlags = packages.map((pkg) => `--filter ${pkg}`).join(" ");

  const { SHARD, SHARD_TOTAL } = env;
  const shardFlag = SHARD && SHARD_TOTAL ? `--shard ${SHARD}/${SHARD_TOTAL}` : "";

  return {
    command: `vp run --parallel --concurrency-limit 2 --filter !allure-js ${filtersFlags} test:run ${shardFlag}`,
    cache: false,
  };
};

export default defineConfig({
  run: {
    cache: {
      tasks: true,
      scripts: false,
    },
    tasks: {
      "ci:test": buildTestTask(),
    },
  },
  fmt: {
    printWidth: 120,
    trailingComma: "all",
    singleQuote: false,
    arrowParens: "always",
    quoteProps: "consistent",
    sortImports: {},
    ignorePatterns: [
      "**/test/fixtures/**",
      "**/dist/**",
      "**/out/**",
      "**/allure-report/**",
      "**/node_modules/**",
      ".yarn/**",
      ".yarnrc.yml",
      "yarn.lock",
      "plugin-ci-version.cjs",
      ".idea/**",
      ".vscode/**",
      ".gitignore",
      ".editorconfig",
    ],
  },
  lint: {
    plugins: ["typescript", "import", "jsdoc", "node"],
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      "**/.yarn/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/allure-report/**",
      "**/test/fixtures/**",
    ],
    options: {
      typeAware: true,
      typeCheck: false,
    },
  },
});

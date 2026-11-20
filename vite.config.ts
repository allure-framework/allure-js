import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: {
      tasks: true,
      scripts: false,
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

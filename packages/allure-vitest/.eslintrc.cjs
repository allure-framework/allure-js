module.exports = {
  extends: ["../../.eslintrc.cjs"],
  ignorePatterns: ["test/fixtures/**"],
  globals: {
    allure: true,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
  overrides: [
    {
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
      files: [".eslintrc.cjs", "vitest.config.ts"],
    }
  ],
};

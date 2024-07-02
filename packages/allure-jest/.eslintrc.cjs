module.exports = {
  extends: ["../../.eslintrc.cjs"],
  globals: {
    allure: true,
  },
  env: {
    jest: true,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
  overrides: [
    {
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
      files: [".eslintrc.cjs", "vitest.config.ts", "vitest-setup.ts"],
    }
  ],
};

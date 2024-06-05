module.exports = {
  extends: ["../../.eslintrc.cjs"],
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
  overrides: [
    {
      files: ["**/*.cjs", "**/*.js"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["./test/fixtures/samples/**/*.js", "./test/fixtures/runner.js"],
      rules: {
        "no-undef": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
      },
    },
  ],
};

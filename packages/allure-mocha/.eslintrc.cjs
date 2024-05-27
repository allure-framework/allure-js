module.exports = {
  globals: {
    __PATH_PREFIX__: true,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: ["../../.eslintrc.cjs"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  overrides: [
    {
      files: ["**/*.cjs"],
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

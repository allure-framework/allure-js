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
  ],
};

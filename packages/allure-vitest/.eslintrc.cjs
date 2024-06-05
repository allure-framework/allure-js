module.exports = {
  extends: ["../../.eslintrc.cjs"],
  ignorePatterns: ["test/fixtures/**"],
  globals: {
    allure: true,
  },
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

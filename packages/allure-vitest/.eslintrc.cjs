module.exports = {
  extends: ["../../.eslintrc.cjs"],
  globals: {
    allure: true,
  },
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

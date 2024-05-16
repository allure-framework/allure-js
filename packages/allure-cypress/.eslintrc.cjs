module.exports = {
  extends: ["../../.eslintrc.cjs"],
  plugins: ["cypress"],
  globals: {
    allure: true,
  },
  env: {
    "cypress/globals": true,
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
};

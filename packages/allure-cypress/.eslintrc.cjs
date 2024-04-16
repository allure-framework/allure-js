module.exports = {
  extends: ["../../.eslintrc.cjs"],
  plugins: ["cypress"],
  globals: {
    allure: true,
  },
  env: {
    "cypress/globals": true,
  }
};

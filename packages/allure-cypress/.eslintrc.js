module.exports = {
  extends: ["../../.eslintrc.js"],
  plugins: ["cypress"],
  globals: {
    allure: true,
  },
  env: {
    jest: true,
    "cypress/globals": true,
  },
};

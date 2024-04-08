module.exports = {
  extends: ["../../.eslintrc.cjs"],
  plugins: ["cypress", "node"],
  globals: {
    allure: true,
  },
  env: {
    "cypress/globals": true,
  },
  rules: {
    "node/file-extension-in-import": ["error", "always"],
  }
};

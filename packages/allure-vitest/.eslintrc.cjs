module.exports = {
  extends: ["../../.eslintrc.cjs"],
  plugins: ["node"],
  globals: {
    allure: true,
  },
  rules: {
    "node/file-extension-in-import": ["error", "always"],
  }
};

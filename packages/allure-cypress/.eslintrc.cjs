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
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

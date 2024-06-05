module.exports = {
  extends: ["../../.eslintrc.cjs"],
  globals: {
    allure: true,
  },
  env: {
    jest: true,
  },
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
}

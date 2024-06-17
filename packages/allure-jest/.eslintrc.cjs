module.exports = {
  extends: ["../../.eslintrc.cjs"],
  globals: {
    allure: true,
  },
  env: {
    jest: true,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
}

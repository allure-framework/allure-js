module.exports = {
  extends: ["../../.eslintrc.cjs"],
  ignorePatterns: ["test/fixtures/**"],
  globals: {
    allure: true,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

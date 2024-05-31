module.exports = {
  extends: ["../../.eslintrc.cjs"],
  plugins: ["n"],
  globals: {
    allure: true,
  },
  rules: {
    "n/file-extension-in-import": ["error", "always"],
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "tsconfig.test.json",
  },
};

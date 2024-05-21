module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  plugins: ["n"],
  extends: [
    "../../.eslintrc.cjs",
  ],
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
  rules: {
    "n/file-extension-in-import": ["error", "always"],
  }
};

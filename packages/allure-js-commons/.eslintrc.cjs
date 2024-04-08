module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  plugins: ["node"],
  extends: [
    "../../.eslintrc.cjs",
  ],
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
  rules: {
    "node/file-extension-in-import": ["error", "always"],
  }
};

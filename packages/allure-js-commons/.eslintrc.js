module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    "../../.eslintrc.js",
  ],
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
};

module.exports = {
  globals: {
    __PATH_PREFIX__: true,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    "../../.eslintrc.cjs",
  ],
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
};

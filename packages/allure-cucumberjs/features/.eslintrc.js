module.exports = {
  extends: ["../.eslintrc.js"],
  rules: {
    "new-cap": "off",
  },
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
};

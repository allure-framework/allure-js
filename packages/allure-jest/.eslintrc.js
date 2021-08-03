module.exports = {
  globals: {
    __PATH_PREFIX__: true,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jasmine: true,
    jest: true
  },
  extends: [
    "../../.eslintrc.js",
  ],
};

module.exports = {
  extends: ["../../.eslintrc.cjs"],
  env: {
    jasmine: true,
  },
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

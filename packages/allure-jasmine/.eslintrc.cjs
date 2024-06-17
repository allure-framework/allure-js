module.exports = {
  extends: ["../../.eslintrc.cjs"],
  env: {
    jasmine: true,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.test.json"],
  },
};

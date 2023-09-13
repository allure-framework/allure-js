module.exports = {
  testEnvironment: "jest-environment-node",
  globals: {
    extensionsToTreatAsEsm: [".ts"],
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)?$": ["ts-jest", {
      useESM: true,

    }],
    //"^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  preset: "ts-jest",
  testMatch: ["**/test/labels.test.ts"],
};

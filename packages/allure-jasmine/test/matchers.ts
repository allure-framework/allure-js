import MatchersUtil = jasmine.MatchersUtil;
import CustomEqualityTester = jasmine.CustomEqualityTester;
import CustomMatcher = jasmine.CustomMatcher;

declare global {
  // eslint-disable-next-line no-redeclare
  namespace jasmine {
    interface Matchers<T> {
      toHaveTestLike(expected: any, expectationFailOutput?: any): boolean;
    }
  }
}

const compare: (actual: any, expected: any) => boolean = (actual, expected) => {
  if (actual === expected) {
    return true;
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    return (
      actual.length >= expected.length && expected.every((exp: any) => actual.some((act: any) => compare(act, exp)))
    );
  }

  if (typeof actual == "object" && typeof expected == "object") {
    return Object.keys(expected).every((key) => key in actual && compare(actual[key], expected[key]));
  }

  if (expected instanceof RegExp) {
    return !!actual.match(expected);
  }

  return (
    typeof actual == typeof expected && ["string", "number", "boolean"].includes(typeof actual) && actual == expected
  );
};

export const matchers = {
  toHaveTestLike: (util: MatchersUtil) => ({
    compare: (actual: any, expected: any) => ({
      pass: compare(actual, { tests: [expected] }),
      message:
        `expected test result like:\n ${JSON.stringify(expected, null, 2)}\n` +
        `but: \n ${JSON.stringify(actual.tests, null, 2)}`,
    }),
  }),
};

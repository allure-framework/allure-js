// eslint-disable-next-line no-undef
import FailedExpectation = jasmine.FailedExpectation;

export const findAnyError = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  expectations = expectations || [];
  if (expectations.length > 0) {
    return expectations[0];
  }
  return null;
};

export const findMessageAboutThrow = (expectations?: FailedExpectation[]) => {
  return expectations?.find((e) => e.matcherName === "");
};

export const last = <T>(arr: readonly T[]) => (arr.length ? arr[arr.length - 1] : undefined);

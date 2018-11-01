import { Status } from 'allure-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findTest, runTests, whenResultsAppeared } from '../utils/index';

@suite
class CommonSuite {
  before() {
    cleanResults();
    runTests('common');
  }

  @test
  shouldHavePassedAndFailedTests() {
    return whenResultsAppeared().then(() => {
      expect(findTest('Common')).not.eq(undefined);
      expect(findTest('shouldPass').status).eq(Status.PASSED);
      expect(findTest('shouldFail').status).eq(Status.FAILED);

      const brokenTest = findTest('shouldBreak');
      expect(brokenTest.status).eq(Status.BROKEN);
      expect(brokenTest.statusDetails.message).eq('Broken');
      expect(brokenTest.statusDetails.trace).not.eq(undefined);

      const skippedTest = findTest('shouldSkip');
      expect(skippedTest.status).eq(Status.SKIPPED);
      expect(skippedTest.statusDetails.message).eq('Test ignored');
      expect(skippedTest.statusDetails.trace).eq(undefined);
    });
  }
}

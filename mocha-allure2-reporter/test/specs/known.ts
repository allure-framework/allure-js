import { Status } from 'allure2-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findStatusDetails, findTest, runTests, whenResultsAppeared } from '../utils';

@suite
class KnownSuite {
  before() {
    cleanResults();
    runTests('known');
  }

  @test
  shouldHaveKnownStatus() {
    const testName = 'shouldHighlightAsKnown';
    return whenResultsAppeared().then(() => {
      expect(findTest('Known')).not.eq(undefined);
      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findStatusDetails(testName, 'known')).to.be.true;
    });
  }
}

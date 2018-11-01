import { Status } from 'allure2-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils';

@suite
class FeatureSuite {
  before() {
    cleanResults();
    runTests('feature');
  }

  @test
  shouldHaveFeature() {
    const testName = 'shouldAssignFeature';
    return whenResultsAppeared().then(() => {
      expect(findTest('Feature')).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'feature').value).eq('Login');
    });
  }
}

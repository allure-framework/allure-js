import { Status } from 'allure-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils/index';

@suite
class OwnerSuite {
  before() {
    cleanResults();
    runTests('owner');
  }

  @test
  shouldHaveOwner() {
    const testName = 'shouldAssignOwner';
    return whenResultsAppeared().then(() => {
      expect(findTest('Owner')).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'owner').value).eq('sskorol');
    });
  }
}

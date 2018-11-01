import { Status } from 'allure-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findTest, runTests, whenResultsAppeared } from '../utils/index';

@suite
class DescriptionSuite {
  before() {
    cleanResults();
    runTests('description');
  }

  @test
  shouldHaveDescription() {
    const testName = 'shouldAssignDescription';
    return whenResultsAppeared().then(() => {
      expect(findTest('Description')).not.eq(undefined);

      const currentTest = findTest(testName);
      expect(currentTest.status).eq(Status.PASSED);
      expect(currentTest.description).eq('Test description');
    });
  }
}

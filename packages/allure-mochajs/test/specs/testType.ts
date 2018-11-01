import { Status } from 'allure-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils/index';

@suite
class TestTypeSuite {
  before() {
    cleanResults();
    runTests('testType');
  }

  @test
  shouldHaveTestType() {
    const testName = 'shouldAssignTestType';
    return whenResultsAppeared().then(() => {
      expect(findTest('TestType')).not.eq(undefined);
      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'testType').value).eq('testrail');
    });
  }
}

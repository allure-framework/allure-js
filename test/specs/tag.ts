import { Status } from 'allure2-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils';

@suite
class TagSuite {
  before() {
    cleanResults();
    runTests('tag');
  }

  @test
  shouldHaveTags() {
    const testName = 'shouldAssignTag';
    return whenResultsAppeared().then(() => {
      expect(findTest('Tag')).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'tag').value).eq('smoke');
    });
  }
}

import { Status } from 'allure-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils/index';

@suite
class StorySuite {
  before() {
    cleanResults();
    runTests('story');
  }

  @test
  shouldHaveStories() {
    const testName = 'shouldAssignStory';
    return whenResultsAppeared().then(() => {
      expect(findTest('Story')).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'story').value).eq('Common story');
    });
  }
}

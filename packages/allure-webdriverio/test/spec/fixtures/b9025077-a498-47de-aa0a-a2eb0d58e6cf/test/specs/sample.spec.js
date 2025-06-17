
        const allure = require('allure-js-commons');
        const { LabelName } = require('allure-js-commons');

        describe('Test Suite', () => {
          it('should add labels', () => {
            allure.label(LabelName.SEVERITY, "critical");
            allure.label(LabelName.EPIC, "test-epic");
            allure.label(LabelName.FEATURE, "test-feature");
            allure.label(LabelName.STORY, "test-story");
            
            expect(true).toBe(true);
          });
        });
      
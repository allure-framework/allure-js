
        const allure = require('allure-js-commons');
        const { ContentType } = require('allure-js-commons');

        describe('Test Suite', () => {
          it('should add attachments', () => {
            allure.attachment("screenshot", Buffer.from('fake-screenshot-data'), ContentType.PNG);
            allure.attachment("text-attachment", "test content", ContentType.TEXT);
            expect(true).toBe(true);
          });
        });
      
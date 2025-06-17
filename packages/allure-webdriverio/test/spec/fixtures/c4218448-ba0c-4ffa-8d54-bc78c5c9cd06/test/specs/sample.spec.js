
        const allure = require('allure-js-commons');

        describe('Test Suite', () => {
          it('should add steps', async () => {
            await allure.step("first step", async () => {
              await allure.step("nested step", async () => {
                expect(true).toBe(true);
              });
            });
            
            await allure.step("second step", async () => {
              expect(1 + 1).toBe(2);
            });
          });
        });
      
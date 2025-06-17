
        describe('Test Suite', () => {
          it('should execute browser commands', () => {
            browser.url('https://example.com');
            const title = browser.getTitle();
            expect(title).toBeDefined();
          });
        });
      
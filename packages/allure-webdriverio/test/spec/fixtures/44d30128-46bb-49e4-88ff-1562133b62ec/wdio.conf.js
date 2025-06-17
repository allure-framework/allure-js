
       exports.config = {
         runner: 'local',
         specs: [
           './test/specs/**/*.js'
         ],
         maxInstances: 1,
         capabilities: [{
           maxInstances: 1,
           browserName: 'chrome',
           'goog:chromeOptions': {
             args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
           }
         }],
         logLevel: 'error',
         bail: 0,
         baseUrl: 'http://localhost',
         waitforTimeout: 10000,
         connectionRetryTimeout: 120000,
         connectionRetryCount: 3,
         services: ['chromedriver'],
         framework: 'mocha',
         reporters: [
           ['spec'],
           ['allure-webdriverio', {
             resultsDir: './allure-results'
           }]
         ],
         mochaOpts: {
           ui: 'bdd',
           timeout: 60000
         }
       };
    
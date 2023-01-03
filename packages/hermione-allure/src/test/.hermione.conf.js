module.exports = {
  sets: {
    desktop: {
      browsers: ["chrome"],
      files: ["src/test/fixtures"]
    }
  },
  browsers: {
    chrome: {
      automationProtocol: 'devtools',
      desiredCapabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['--headless']
        }
      }
    },
  },
  plugins: {
    "hermione-allure": {
      writer: {
        results: [],
        writeResult: function(result) {
          this.results.push(result)
        }
      }
    }
  }
};

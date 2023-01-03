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
        attachments: [],
        writeResult: function(result) {
          this.results.push(result)
        },
        writeAttachment: function(name, content, type) {
          this.attachments.push({
            name,
            content,
            type,
          })
        }
      }
    }
  }
};

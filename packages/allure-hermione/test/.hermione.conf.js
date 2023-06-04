module.exports = {
  gridUrl: "http://localhost:4444/wd/hub",
  httpTimeout: 50000,
  sessionQuitTimeout: 50000,
  sets: {
    desktop: {
      browsers: ["headless"],
      files: ["test/fixtures"],
    },
  },
  browsers: {
    headless: {
      automationProtocol: "webdriver",
      desiredCapabilities: {
        browserName: "firefox",
        "moz:firefoxOptions": {
          args: ["--headless"],
        }
      },
    },
  },
  plugins: {
    "allure-hermione": {
      writer: {
        results: [],
        attachments: [],
        writeResult: function (result) {
          this.results.push(result);
        },
        writeAttachment: function (name, content, type) {
          this.attachments.push({
            name,
            content,
            type,
          });
        },
      },
    },
  },
};

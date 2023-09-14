module.exports = {
  gridUrl: "http://localhost:4444/wd/hub",
  browsers: {
    headless: {
      automationProtocol: "webdriver",
      desiredCapabilities: {
        browserName: "chrome",
        "goog:chromeOptions": {
          args: ["headless"],
        },
      },
    },
  },
  saveHistoryMode: 'none',
};

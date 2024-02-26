module.exports = {
  browsers: {
    headless: {
      automationProtocol: "devtools",
      desiredCapabilities: {
        browserName: "chrome",
        logLevel: "error",
        "goog:chromeOptions": {
          args: ["headless"],
        },
      },
    },
  },
};

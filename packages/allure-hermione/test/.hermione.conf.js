module.exports = {
  sets: {
    desktop: {
      browsers: ["chrome"],
      files: ["test/fixtures"],
    },
  },
  browsers: {
    chrome: {
      automationProtocol: "devtools",
      desiredCapabilities: {
        browserName: "chrome",
        "goog:chromeOptions": {
          args: ["--headless"],
        },
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

module.exports = {
  sets: {
    desktop: {
      browsers: ["headless"],
      files: ["test/fixtures"],
    },
  },
  browsers: {
    headless: {
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
    "hermione-headless-chrome": {
      enabled: true,
      browserId: "headless",
      version: "112",
    },
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

module.exports = {
  gridUrl: "http://localhost:4444/wd/hub",
  sets: {
    desktop: {
      browsers: ["headless"],
      files: ["test/fixtures"],
    },
  },
  browsers: {
    headless: {
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

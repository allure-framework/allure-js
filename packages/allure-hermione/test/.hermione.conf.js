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
        categories: [],
        environmentInfo: {},
        writeResult: function (result) {
          this.results.push(result);
        },
        writeAttachment: function (source, mimetype, encoding) {
          this.attachments.push({
            source,
            mimetype,
            encoding,
          });
        },
        writeCategoriesDefinitions: function (categories) {
          this.categories.push(...categories);
        },
        writeEnvironmentInfo: function (info) {
          Object.assign(this.environmentInfo, info);
        },
      },
    },
  },
};

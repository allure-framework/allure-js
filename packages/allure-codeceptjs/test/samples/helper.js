const Helper = require("@codeceptjs/helper");

class MyHelper extends Helper {
  async pass() {
    await Promise.resolve();
  }

  async next() {
    await Promise.resolve();
  }

  async parameters(page, element) {
    await Promise.resolve();
  }

  async fail() {
    await Promise.reject(new Error("an error"));
  }
}

module.exports = MyHelper;

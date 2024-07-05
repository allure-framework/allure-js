const Helper = require("@codeceptjs/helper");

class MyHooksHelper extends Helper {
  _init() {}

  _finishTest() {}

  _before() {}

  _after() {}

  _beforeStep() {}

  _afterStep() {}

  _beforeSuite() {}

  _afterSuite() {}

  _passed() {}

  _failed() {}

  async pass() {
    await Promise.resolve();
  }
}

module.exports = MyHooksHelper;

/* eslint no-underscore-dangle: 0 */
const ParallelBuffered = require("mocha/lib/nodejs/reporters/parallel-buffered.js");
const { MessageWriter } = require("allure-js-commons/sdk/reporter");

class AllureMochaParallelWriter extends MessageWriter {
  constructor() {
    super();
    this.events = [];
  }

  sendData(path, type, data) {
    const event = { path, type, data: data.toString("base64") };
    this.events.push(JSON.stringify(event));
  }
}

const writer = new AllureMochaParallelWriter();

const originalDone = ParallelBuffered.prototype.done;
ParallelBuffered.prototype.done = function (failures, callback) {
  for (const event of this.events) {
    if (event.originalError) {
      // workaround the "Converting circular structure to JSON" error
      if (event.originalError.multiple) {
        event.originalError.multiple = event.originalError.multiple.filter((e) => !Object.is(e, event.originalError));
      }
    }
  }
  return originalDone.call(this, failures, (r) => {
    r.__allure__ = writer.events;
    writer.events = [];
    callback(r);
  });
};

module.exports = writer;

const { Given } = require("@cucumber/cucumber");
const { attachment } = require("allure-js-commons/new");

Given("add a text", async () => {
  await attachment("Text attachment", "some text", "text/plain");
});

Given("add an image", async () => {
  const base64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGAo/w8AAfIBdzDXaSAAAAAASUVORK5CYII=";

  await attachment("Image attachment", base64Image, "image/png");
});

Given("add a cucumber text attachment", function () {
  this.attach("some text", "text/plain");
});

Given("add a cucumber binary text attachment", function () {
  this.attach(Buffer.from("some text"), "text/plain");
});

const { Given } = require("@cucumber/cucumber");

Given("add a text", function () {
  this.attach("some text");
});

Given("add an image", function () {
  const base64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGAo/w8AAfIBdzDXaSAAAAAASUVORK5CYII=";
  const decodedImage = Buffer.from(base64Image, "base64");

  this.attach(decodedImage, "image/png");
});

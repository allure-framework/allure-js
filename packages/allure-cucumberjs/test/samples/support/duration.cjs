const { Given, Before } = require("@cucumber/cucumber");

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

Before(async () => {
  await sleep(80);
});

Given("a sleep", async () => {
  await sleep(100);
});

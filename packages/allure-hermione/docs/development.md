# Development

## Running hermione tests locally

The easiest way to run Hermione tests locally
is [Selenium standalone grid](https://www.npmjs.com/package/selenium-standalone).

```shell
npm i -g selenium-standalone   # install the package globally
selenium-standalone install    # install selenium server
selenium-standalone start      # start selenium server
```

Then you are able to run Hermione tests with the following settings:

```js
// .hermione.conf.js
module.exports = {
  gridUrl: "http://localhost:4444/wd/hub",
  // ...
};
```

Tests in the package already runs the grid before themselves, so you don't need to start it
manually.

**Don't forget to compile the reporter before running tests**!

## Using repeater

To test the reporter with `hermione-test-repeater`, install `hermione-test-repeater` package and
add the following configuration to your `.hermione.conf.js`:

```js
module.exports = {
  // ...
  plugins: {
    "hermione-test-repeater": {
      enabled: true,
      repeat: 10,
      minRepeat: 10,
      maxRepeat: 100,
      uniqSession: true,
    },
  },
};
```

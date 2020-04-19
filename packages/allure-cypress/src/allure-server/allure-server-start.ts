import { AllureRuntime, IAllureConfig } from "allure-js-commons";
import bodyParser from "body-parser";
import express, { Request } from "express";
import { allureApiUrls } from "../consts/allure-api-urls";
import { AllureReporter } from "allure-mocha";

const multer = require("multer");
const app = express();
const config: IAllureConfig = { resultsDir: "allure-results" };
const codeReporter = new AllureReporter(new AllureRuntime(config));
const allure = codeReporter.getInterface();
const upload = multer();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// необходимо для wait-on
app.get("", (req: Request, res) => {
  res.sendStatus(200);
});

app.get("__close__", (req: Request, res) => {
  res.sendStatus(200);
  close();
});

app.post(allureApiUrls.onSuite, (req: Request, res) => {
  const { title } = req.body;

  codeReporter.startSuite(title);

  res.sendStatus(200);
});

app.post(allureApiUrls.onSuiteEnd, (_, res) => {
  codeReporter.endSuite();

  res.sendStatus(200);
});

app.post(allureApiUrls.onTest, (req: Request, res) => {
  const { test } = req.body;

  codeReporter.startCase(deserializeTest(test));

  res.sendStatus(200);
});

app.post(allureApiUrls.onPassed, (req: Request, res) => {
  const { test } = req.body;

  codeReporter.passTestCase(deserializeTest(test));

  res.sendStatus(200);
});

app.post(allureApiUrls.onFailed, (req: Request, res) => {
  const { test, error } = req.body;

  codeReporter.failTestCase(deserializeTest(test), error);

  res.sendStatus(200);
});

app.post(allureApiUrls.onPending, (req: Request, res) => {
  const { test } = req.body;

  codeReporter.pendingTestCase(deserializeTest(test));

  res.sendStatus(200);
});

app.post(allureApiUrls.epic, (req: Request, res) => {
  const { name } = req.body;

  allure.epic(name);

  res.sendStatus(200);
});

app.post(allureApiUrls.feature, (req: Request, res) => {
  const { name } = req.body;

  allure.feature(name);

  res.sendStatus(200);
});

app.post(allureApiUrls.story, (req: Request, res) => {
  const { name } = req.body;

  allure.story(name);

  res.sendStatus(200);
});

app.post(allureApiUrls.label, (req: Request, res) => {
  const { name, value } = req.body;

  allure.label(name, value);

  res.sendStatus(200);
});

const stepsPromisesDictionary: {[key: string]: Function} = {};
let stepId = 1;

app.post(allureApiUrls.stepStart, (req, res) => {
  const { name } = req.body;

  const stepPromise = new Promise(resolve => {
    stepsPromisesDictionary[stepId] = resolve;
  });

  allure.step(name, () => stepPromise);

  res.send(`${stepId++}`);
});

app.post(allureApiUrls.stepEnd, (req, res) => {
  const { stepId } = req.body;
  console.log(stepId);

  if (stepsPromisesDictionary[stepId]) {
    stepsPromisesDictionary[stepId]();

    delete stepsPromisesDictionary[stepId];
  }

  res.sendStatus(200);
});

app.post(allureApiUrls.attachment, upload.any(), (req, res) => {
  const { name, type } = req.body;
  const buffer = (req as any).files[0].buffer;

  allure.attachment(name, buffer, type);

  res.sendStatus(200);
});

function deserializeTest(test: any): Mocha.Test {
  const fullTitle = test.fullTitle;
  const titlePath = test.titlePath;

  const fullTitleParent = test.parent.fullTitle;
  const titlePathParent = test.parent.titlePath;

  test.fullTitle = () => fullTitle;
  test.titlePath = () => titlePath;
  test.parent.titlePath = () => fullTitleParent;
  test.parent.titlePath = () => titlePathParent;

  return test;
}

const server = app.listen(3002, () => {
  console.log(1);
});

function close() {
  server.close();
  process.exit(1);
}

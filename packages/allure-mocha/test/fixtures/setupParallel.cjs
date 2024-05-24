/* eslint no-underscore-dangle: 0 */
const { BufferedWorkerPool } = require("mocha/lib/nodejs/buffered-worker-pool.js");
const process = require("process");
const path = require("path");

let poolClassPatched = false;
let workerClassPatched = false;

const createStreamDataHandler = (files, workerProcess, hostStream) => (data) =>
  hostStream.write(`In ${files.get(workerProcess.pid)}: ${data}`);

const forwardStreamToTestEnv = (files, workerProcess, workerStream, hostStream) => {
  workerStream.on("data", createStreamDataHandler(files, workerProcess, hostStream));
};

const forwardMessagesToTestEnv = (workerProcess) => {
  workerProcess.on("message", (msg) => {
    const allureData = msg?.result?.__allure__;
    if (allureData && process.send) {
      for (const allureEvent of allureData) {
        process.send(allureEvent);
      }
    }
  });
};

const forwardWorkerToTestEnv = (files, workerProcess) => {
  forwardMessagesToTestEnv(workerProcess);
  forwardStreamToTestEnv(files, workerProcess, workerProcess.stdout, process.stdout);
  forwardStreamToTestEnv(files, workerProcess, workerProcess.stderr, process.stderr);
};

const createPatchedWorkerExec = (files, original) =>
  function (method, params, ...args) {
    let specPath = params[0];
    if (typeof specPath === "string") {
      specPath = path.relative(process.cwd(), specPath);
    }
    files.set(this.worker.pid, specPath);
    return original.call(this, method, params, ...args);
  };

const ensureWorkerClassPatched = (files, worker) => {
  if (!workerClassPatched) {
    const workerProto = worker.constructor.prototype;
    workerProto.exec = createPatchedWorkerExec(files, workerProto.exec);
    workerClassPatched = true;
  }
};

const createPatchedPoolCreateWorker = (files, original) =>
  function () {
    const worker = original.call(this);
    forwardWorkerToTestEnv(files, worker.worker);
    ensureWorkerClassPatched(files, worker);
    return worker;
  };

const createPatchedPoolCreate =
  (original) =>
  (options = {}, ...args) => {
    options.forkOpts = { ...(options.forkOpts ?? {}), stdio: "pipe" };
    const files = new Map();
    const pool = original(options, ...args);
    const poolProto = pool._pool.constructor.prototype;
    poolProto._createWorkerHandler = createPatchedPoolCreateWorker(files, poolProto._createWorkerHandler);
    return pool;
  };

const patchPool = () => {
  BufferedWorkerPool.create = createPatchedPoolCreate(BufferedWorkerPool.create);
};

const ensurePoolPatched = () => {
  if (!poolClassPatched) {
    patchPool();
    poolClassPatched = true;
  }
};

const shouldPatchPool = () => !process.connected || process.ppid.toString() === process.env.ALLURE_MOCHA_TESTHOST_PID;

const patchLeader = () => {
  if (shouldPatchPool()) {
    ensurePoolPatched();
  }
};

patchLeader();

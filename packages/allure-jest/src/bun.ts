// Keep this as a static import so the built CJS preload stays parseable and
// Bun can still let us replace the module through mock.module below.
import * as bunTest from "bun:test";

import * as allure from "allure-js-commons";

import { installBunModuleMock } from "./bun/index.js";

installBunModuleMock(bunTest, allure);

export {};

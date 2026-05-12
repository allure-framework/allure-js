import "allure-vitest/setup";
import * as chai from "chai";

import { allureChai } from "./src/index.js";

chai.use(allureChai);

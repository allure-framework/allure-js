import TestEnvironment from "jest-environment-jsdom";
import createJestEnvironment from "./environmentFactory.js";

export default createJestEnvironment(TestEnvironment);

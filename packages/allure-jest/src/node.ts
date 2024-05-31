import { TestEnvironment } from "jest-environment-node";
import createJestEnvironment from "./environmentFactory.js";

export default createJestEnvironment(TestEnvironment);

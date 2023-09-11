import JsDomEnvironment from "jest-environment-jsdom";
import createJestEnvironment from "./AllureJest";

export default createJestEnvironment(JsDomEnvironment);

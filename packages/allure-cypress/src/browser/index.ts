import { enableAllure, enableReportingOfCypressScreenshots } from "./events/index.js";
import { isAllureInitialized, setAllureInitialized } from "./state.js";

export const initializeAllure = () => {
  if (isAllureInitialized()) {
    return;
  }

  setAllureInitialized();

  enableAllure();
  enableReportingOfCypressScreenshots();
};

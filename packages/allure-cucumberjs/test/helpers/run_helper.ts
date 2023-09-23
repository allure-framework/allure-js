import { loadConfiguration, loadSupport, runCucumber } from "@cucumber/cucumber/api";

export const runFeatures = async () => {
  const { runConfiguration } = await loadConfiguration({}, {});
  const supportCodeLibrary = await loadSupport(runConfiguration);
  const runResult = await runCucumber(runConfiguration);
};

const getCodeceptConfig = () => {
  const codeceptjs = globalThis.codeceptjs;

  if (!codeceptjs?.config?.addHook) {
    throw new Error("CodeceptJS host is not available");
  }

  return codeceptjs.config;
};

const setCommonPlugins = () => {
  getCodeceptConfig().addHook((config) => {
    if (!config.plugins) {
      config.plugins = {};
    }

    config.plugins.retryFailedStep = config.plugins.retryFailedStep || { enabled: true };
    config.plugins.screenshotOnFail = config.plugins.screenshotOnFail || {};
    config.plugins.pauseOn = config.plugins.pauseOn || {};
    config.plugins.browser = config.plugins.browser || {};
    config.plugins.aiTrace = config.plugins.aiTrace || {};
  });
};

module.exports = {
  setCommonPlugins,
};

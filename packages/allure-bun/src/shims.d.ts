declare module "bun:test" {
  export const mock: {
    module: (name: string, factory: () => unknown) => void;
  };
}

declare global {
  var allureBunConfig: import("allure-js-commons/sdk/reporter").ReporterConfig | undefined;
}

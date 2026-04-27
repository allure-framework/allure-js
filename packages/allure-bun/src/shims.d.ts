declare module "bun:test" {
  export const mock: {
    module: (name: string, factory: () => unknown) => void;
  };
}

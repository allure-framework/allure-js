declare module "properties" {
  function parse(data: string, options?: Config): Record<string, any> | undefined;
  function stringify(obj: any, options?: Config): string;
  function stringify(obj: any, options: Config, callback: () => void): undefined;

  class Config {
    path?: string;
    comment?: string;
    separator?: string;
    unicode?: boolean;
    replacer?: () => void;
  }
}

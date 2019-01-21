declare module "properties" {
  function stringify(obj: any, options?: Config): String;
  function stringify(obj: any, options: Config, callback: Function): undefined ;

  class Config {
    path?: string;
    comment?: string;
    separator?: string;
    unicode?: boolean;
    replacer?: Function;
  }
}

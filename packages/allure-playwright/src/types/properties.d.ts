declare module "properties" {
  export function stringify(
    data: any,
    options: {
      path?: string;
      comment?: string;
      separator?: string;
      unicode?: boolean;
      replacer?: (key: string, value: any) => any;
    },
    cb?: (result: string, err?: Error) => void,
  ): string;

  export function parse(
    data: string,
    options?: {
      path?: boolean;
      strict?: boolean;
      sections?: boolean;
      namespaces?: boolean;
      variables?: boolean;
      vars?: boolean;
      include?: boolean;
      separators?: string | string[];
      comments?: string | string[];
      reviver?: (key: string, value: any) => any;
    },
  ): undefined | object;
}

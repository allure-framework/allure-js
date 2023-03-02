declare module "codeceptjs/lib/command/run" {
  const codeceptRun: (tests: any, options: any) => Promise<void>;
  export = codeceptRun;
}

// eslint-disable-next-line no-var
declare var postProcessorForTest: (writer: InMemoryAllureWriter) => void;

import { EventEmitter } from "node:events";

/**
 * Allows to use async functions as event emitter listeners while preserving
 * order of their execution.
 * Might be useful if we decide to use async listeners in ReporterRuntime.
 */
export class AsyncEventEmitterAdapter<T extends EventEmitter> {
  private chain = Promise.resolve();
  private error: Error | undefined;
  constructor (private readonly emitter: T, private readonly onerror: (e: Error) => Promise<void>) {}

  on = (eventName: string | symbol, listener: (...args: any[]) => Promise<void>) => {
    this.emitter.on(eventName, (...args: any[]) => {
      if (this.error) {
        throw this.error;
      }
      this.chain = new Promise((resolve, reject) => {
        this.chain.then(
          () => {
            listener(...args).then(resolve, (e) => {
              this.error = e instanceof Error
                ? e
                : new Error(e?.toString() ?? "unknown error");
              this.error.message = `INTERNAL ERROR in ${String(eventName)}: ${e.message}`;
              this.onerror(this.error).finally(() => reject(this.error));
            });
          },
          reject,
        );
      });
    });
    return this;
  };

  /**
   * Asynchronously waits until all listeners are done.
   */
  wait = async () => await this.chain;

  /**
   * Invokes a callback once all async listeners are done.
   */
  done = <TArgs extends any[], TResult>(callback: ((...args: TArgs) => TResult) | undefined, ...args: TArgs) => {
    this.chain.finally(() => {
      callback?.(...args);
      this.chain = Promise.resolve();
      this.error = undefined;
    });
  };

  static wrap = <T extends EventEmitter>(target: T, onerror: (error: Error) => Promise<void>) =>
    new AsyncEventEmitterAdapter<T>(target, onerror);
};

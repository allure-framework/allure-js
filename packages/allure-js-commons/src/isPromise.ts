export function isPromise(obj: any): boolean {
  return !!obj && (typeof obj === "object" || typeof obj === "function")
    && typeof obj.then === "function";
}

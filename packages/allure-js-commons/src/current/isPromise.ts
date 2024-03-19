export const isPromise = (obj: any): boolean =>
  !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
